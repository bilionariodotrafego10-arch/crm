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

  const { data: conversa } = await admin
    .from('whatsapp_conversas')
    .upsert(
      {
        instancia_id: instancia.id,
        telefone_contato: mensagem.telefone,
        // Não sobrescreve um nome já conhecido com null: muitos payloads da
        // Z-API vêm sem senderName, e uma mensagem posterior sem nome não
        // deve apagar o nome capturado numa mensagem anterior.
        ...(mensagem.nomeContato ? { nome_contato: mensagem.nomeContato } : {}),
        ultima_mensagem_em: mensagem.momento.toISOString(),
      },
      { onConflict: 'instancia_id,telefone_contato' }
    )
    .select('id')
    .single()

  if (!conversa) {
    return NextResponse.json({ error: 'falha ao registrar conversa' }, { status: 500 })
  }

  let midiaCaminho: string | null = null
  if (mensagem.midiaUrl) {
    midiaCaminho = await baixarEArmazenarMidia(admin, mensagem.midiaUrl, mensagem.tipo as 'imagem' | 'audio')
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
