import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validarAssinaturaWebhook, extrairMensagemRecebida } from '@/lib/zapi/webhook'
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

  const mensagem = extrairMensagemRecebida(payload)
  if (!mensagem) {
    // Evento que não é mensagem recebida (status, confirmação, etc.) — ignorado.
    return NextResponse.json({ ok: true })
  }

  const { data: conversa } = await admin
    .from('whatsapp_conversas')
    .upsert(
      {
        instancia_id: instancia.id,
        telefone_contato: mensagem.telefone,
        nome_contato: mensagem.nomeContato,
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

  await admin.from('whatsapp_mensagens').insert({
    conversa_id: conversa.id,
    direcao: 'recebida',
    tipo: mensagem.tipo,
    conteudo_texto: mensagem.conteudoTexto,
    midia_url: midiaCaminho,
    status_envio: 'enviado',
    criado_em: mensagem.momento.toISOString(),
  })

  return NextResponse.json({ ok: true })
}
