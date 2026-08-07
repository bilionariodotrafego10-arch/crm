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
  chatLid: string | null
  nomeContato: string | null
  tipo: 'texto' | 'imagem' | 'audio' | 'video' | 'documento'
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
  // O WhatsApp às vezes retorna "phone" como o número real e às vezes como
  // um identificador de privacidade "@lid" (varia por contato/evento, sem
  // padrão previsível). "chatLid", quando presente, é o identificador
  // estável recomendado pela Z-API pra agrupar mensagens do mesmo contato —
  // ver route.ts, que usa isso pra achar/criar a conversa certa.
  const chatLid = typeof p.chatLid === 'string' ? p.chatLid : null
  // Em eventos fromMe=true, "senderName" é o nome do PRÓPRIO dono da conta
  // (quem enviou), não do contato do outro lado — usar aqui sobrescreveria o
  // nome já conhecido do contato com o nome do usuário. Só confiamos em
  // senderName pra mensagens recebidas (fromMe=false).
  const nomeContato = !deMim && typeof p.senderName === 'string' ? p.senderName : null
  const momento = new Date(p.momment)
  // Campo não confirmado 100% via docs ao vivo — tratado defensivamente:
  // se ausente ou de outro tipo, cai para null (idempotência apenas
  // "melhor esforço" nesse caso, sem quebrar nada existente).
  const messageId = typeof p.messageId === 'string' ? p.messageId : null

  const base = { telefone: p.phone, chatLid, nomeContato, momento, messageId, deMim }

  const texto = p.text as { message?: string } | undefined
  if (texto && typeof texto.message === 'string') {
    return { ...base, tipo: 'texto', conteudoTexto: texto.message, midiaUrl: null }
  }

  const imagem = p.image as { imageUrl?: string; caption?: string } | undefined
  if (imagem && typeof imagem.imageUrl === 'string') {
    return { ...base, tipo: 'imagem', conteudoTexto: imagem.caption || null, midiaUrl: imagem.imageUrl }
  }

  const audio = p.audio as { audioUrl?: string } | undefined
  if (audio && typeof audio.audioUrl === 'string') {
    return { ...base, tipo: 'audio', conteudoTexto: null, midiaUrl: audio.audioUrl }
  }

  const video = p.video as { videoUrl?: string; caption?: string } | undefined
  if (video && typeof video.videoUrl === 'string') {
    return { ...base, tipo: 'video', conteudoTexto: video.caption || null, midiaUrl: video.videoUrl }
  }

  const documento = p.document as { documentUrl?: string; fileName?: string } | undefined
  if (documento && typeof documento.documentUrl === 'string') {
    return { ...base, tipo: 'documento', conteudoTexto: documento.fileName || null, midiaUrl: documento.documentUrl }
  }

  return null
}
