import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validarAssinaturaWebhook, extrairMensagemWebhook } from '@/lib/zapi/webhook'
import { baixarEArmazenarMidia } from '@/lib/zapi/midia'

export async function POST(request: NextRequest, { params }: { params: { instanciaId: string } }) {
  const secretRecebido = request.nextUrl.searchParams.get('secret')
  const admin = createAdminClient()

  const { data: instancia } = await admin
    .from('whatsapp_instancias')
    .select('id, ativo, webhook_secret')
    .eq('id', params.instanciaId)
    .maybeSingle()

  if (!instancia || !instancia.ativo || !validarAssinaturaWebhook(secretRecebido, instancia.webhook_secret)) {
    console.error(`[webhook zapi][DEBUG] requisição rejeitada na autenticação para instância ${params.instanciaId}`)
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    console.error(`[webhook zapi] payload malformado para instância ${params.instanciaId}`)
    return NextResponse.json({ error: 'payload inválido' }, { status: 400 })
  }

  const mensagem = extrairMensagemWebhook(payload)
  if (!mensagem) {
    // Evento que não é mensagem de chat (status, confirmação, etc.) — ignorado.
    return NextResponse.json({ ok: true })
  }

  // O campo "phone" da Z-API não é um identificador estável: pro mesmo
  // contato, ele pode vir como número real numa mensagem e como um "@lid"
  // (identificador de privacidade do WhatsApp) noutra — isso fazia o upsert
  // por telefone_contato criar uma conversa nova a cada troca de formato
  // (sintoma: mensagens enviadas pelo celular "sumindo" numa aba separada).
  // "chatLid", quando presente, é estável — damos preferência a ele pra
  // localizar a conversa já existente, com telefone_contato como respaldo.
  let existente: { id: string; telefone_contato: string } | null = null
  if (mensagem.chatLid) {
    const { data } = await admin
      .from('whatsapp_conversas')
      .select('id, telefone_contato')
      .eq('instancia_id', instancia.id)
      .eq('chat_lid', mensagem.chatLid)
      .maybeSingle()
    existente = data
  }
  if (!existente) {
    const { data } = await admin
      .from('whatsapp_conversas')
      .select('id, telefone_contato')
      .eq('instancia_id', instancia.id)
      .eq('telefone_contato', mensagem.telefone)
      .maybeSingle()
    existente = data
  }

  const ehLid = (valor: string) => valor.endsWith('@lid')
  // Nunca troca um telefone_contato real já conhecido por um "@lid" — só
  // atualiza quando ainda não sabíamos o telefone, ou quando o valor novo é
  // uma melhoria (um número real substituindo um "@lid" antigo). Sem essa
  // guarda, a própria correção do chat_lid acima ficaria inútil: a conversa
  // seria achada certa, mas telefone_contato seria corrompido do mesmo jeito.
  const telefoneParaSalvar =
    !existente?.telefone_contato || (ehLid(existente.telefone_contato) && !ehLid(mensagem.telefone))
      ? mensagem.telefone
      : existente.telefone_contato

  const dadosConversa = {
    instancia_id: instancia.id,
    telefone_contato: telefoneParaSalvar,
    ...(mensagem.chatLid ? { chat_lid: mensagem.chatLid } : {}),
    // Não sobrescreve um nome já conhecido com null: muitos payloads da
    // Z-API vêm sem senderName, e uma mensagem posterior sem nome não
    // deve apagar o nome capturado numa mensagem anterior.
    ...(mensagem.nomeContato ? { nome_contato: mensagem.nomeContato } : {}),
    ultima_mensagem_em: mensagem.momento.toISOString(),
  }

  let conversa: { id: string } | null = null
  if (existente) {
    const { data, error } = await admin.from('whatsapp_conversas').update(dadosConversa).eq('id', existente.id).select('id').single()
    if (error?.code === '23505') {
      // A "promoção" de telefone_contato (ver telefoneParaSalvar acima) colidiu
      // com outra conversa que já tem esse número — duplicata antiga do mesmo
      // bug que essa correção resolve daqui pra frente (uma conversa ficou com
      // o "@lid" e outra com o número real do mesmo contato). Em vez de
      // derrubar a mensagem, atualiza sem trocar o telefone dessa vez; a
      // mesclagem das duas linhas duplicadas fica pendente (manual).
      const { data: semTrocarTelefone } = await admin
        .from('whatsapp_conversas')
        .update({ ...dadosConversa, telefone_contato: existente.telefone_contato })
        .eq('id', existente.id)
        .select('id')
        .single()
      conversa = semTrocarTelefone
    } else {
      conversa = data
    }
  } else {
    const { data, error } = await admin.from('whatsapp_conversas').insert(dadosConversa).select('id').single()
    if (error?.code === '23505') {
      // Corrida: outro evento concorrente (ex.: rajada de mensagens no mesmo
      // instante) criou a conversa entre o SELECT acima e este INSERT. Busca
      // de novo em vez de derrubar a mensagem com erro 500.
      const { data: recuperada } = mensagem.chatLid
        ? await admin.from('whatsapp_conversas').select('id').eq('instancia_id', instancia.id).eq('chat_lid', mensagem.chatLid).maybeSingle()
        : await admin.from('whatsapp_conversas').select('id').eq('instancia_id', instancia.id).eq('telefone_contato', mensagem.telefone).maybeSingle()
      if (recuperada) {
        const { data: atualizada } = await admin.from('whatsapp_conversas').update(dadosConversa).eq('id', recuperada.id).select('id').single()
        conversa = atualizada
      }
    } else {
      conversa = data
    }
  }

  if (!conversa) {
    return NextResponse.json({ error: 'falha ao registrar conversa' }, { status: 500 })
  }

  let midiaCaminho: string | null = null
  if (mensagem.midiaUrl && mensagem.tipo !== 'texto') {
    midiaCaminho = await baixarEArmazenarMidia(admin, mensagem.midiaUrl, mensagem.tipo)
  }

  const direcao: 'enviada' | 'recebida' = mensagem.deMim ? 'enviada' : 'recebida'

  const novaMensagem = {
    conversa_id: conversa.id,
    direcao,
    tipo: mensagem.tipo,
    conteudo_texto: mensagem.conteudoTexto,
    midia_url: midiaCaminho,
    status_envio: 'enviado' as const,
    criado_em: mensagem.momento.toISOString(),
    zapi_message_id: mensagem.messageId,
  }

  // O índice único em zapi_message_id não cobre valores NULL (cada NULL é
  // distinto), então upsert com onConflict só faz sentido quando temos um
  // messageId real — caso contrário caímos para um insert simples.
  const { error: erroMensagem } = mensagem.messageId
    ? await admin
        .from('whatsapp_mensagens')
        .upsert(novaMensagem, { onConflict: 'zapi_message_id', ignoreDuplicates: true })
    : await admin.from('whatsapp_mensagens').insert(novaMensagem)

  if (erroMensagem) {
    console.error(
      `[webhook zapi] falha ao gravar mensagem (conversa ${conversa.id}, instância ${instancia.id}):`,
      erroMensagem
    )
    return NextResponse.json({ error: 'falha ao registrar mensagem' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
