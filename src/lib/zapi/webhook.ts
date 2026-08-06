import { timingSafeEqual } from 'crypto'

export function validarAssinaturaWebhook(secretRecebido: string | null, secretEsperado: string): boolean {
  if (!secretRecebido) return false
  const a = Buffer.from(secretRecebido)
  const b = Buffer.from(secretEsperado)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export interface MensagemWebhookZApi {
  telefone: string
  nomeContato: string | null
  tipo: 'texto' | 'imagem' | 'audio'
  conteudoTexto: string | null
  midiaUrl: string | null
  momento: Date
  messageId: string | null
  deMim: boolean
}

export function extrairMensagemWebhook(payload: unknown): MensagemWebhookZApi | null {
  if (typeof payload !== 'object' || payload === null) return null
  const p = payload as Record<string, unknown>

  if (p.type !== 'ReceivedCallback') return null
  if (p.isGroup === true) return null
  if (typeof p.phone !== 'string') return null
  if (typeof p.momment !== 'number') return null

  const deMim = p.fromMe === true
  const nomeContato = typeof p.senderName === 'string' ? p.senderName : null
  const momento = new Date(p.momment)
  // Campo não confirmado 100% via docs ao vivo — tratado defensivamente:
  // se ausente ou de outro tipo, cai para null (idempotência apenas
  // "melhor esforço" nesse caso, sem quebrar nada existente).
  const messageId = typeof p.messageId === 'string' ? p.messageId : null

  const texto = p.text as { message?: string } | undefined
  if (texto && typeof texto.message === 'string') {
    return { telefone: p.phone, nomeContato, tipo: 'texto', conteudoTexto: texto.message, midiaUrl: null, momento, messageId, deMim }
  }

  const imagem = p.image as { imageUrl?: string; caption?: string } | undefined
  if (imagem && typeof imagem.imageUrl === 'string') {
    return { telefone: p.phone, nomeContato, tipo: 'imagem', conteudoTexto: imagem.caption || null, midiaUrl: imagem.imageUrl, momento, messageId, deMim }
  }

  const audio = p.audio as { audioUrl?: string } | undefined
  if (audio && typeof audio.audioUrl === 'string') {
    return { telefone: p.phone, nomeContato, tipo: 'audio', conteudoTexto: null, midiaUrl: audio.audioUrl, momento, messageId, deMim }
  }

  return null
}
