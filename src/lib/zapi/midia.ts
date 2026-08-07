import { randomUUID } from 'crypto'
import { isIPv4 } from 'net'
import type { SupabaseClient } from '@supabase/supabase-js'

const TAMANHO_MAXIMO_BYTES = 16 * 1024 * 1024 // 16MB, mesmo limite do bucket whatsapp-midia (migração 004)
const TIMEOUT_MS = 15_000

function origemEhSegura(urlOrigem: string): boolean {
  let url: URL
  try {
    url = new URL(urlOrigem)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false

  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host === '0.0.0.0') return false

  // new URL() sempre envolve literais IPv6 em colchetes (ex: "[::1]").
  // Rejeitamos qualquer literal IPv6 por completo: mídia legítima da Z-API
  // não é servida por IP literal, e IPv6 tem formas equivalentes demais
  // (::1, ::ffff:127.0.0.1, fe80::, etc.) para validar com segurança via
  // comparação simples de string.
  if (host.startsWith('[')) return false

  if (isIPv4(host)) {
    const [a, b] = host.split('.').map(Number)
    if (a === 127 || a === 10 || a === 0) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 169 && b === 254) return false
  }

  return true
}

export type TipoMidia = 'imagem' | 'audio' | 'video' | 'documento'

// Extensão padrão por tipo — usada aqui como fallback quando o content-type
// da origem não é confiável, e reaproveitada em dashboard/whatsapp/actions.ts
// como extensão do upload de saída (CRM -> Z-API), pra não duplicar a mesma
// convenção em dois lugares.
export const EXTENSAO_PADRAO: Record<TipoMidia, string> = {
  imagem: 'jpg', audio: 'ogg', video: 'mp4', documento: 'bin',
}

// documento não tem um prefixo único de content-type (pdf, docx, xlsx, etc.),
// então não validamos prefixo pra esse tipo — aceitamos o que a Z-API mandar
// (o bucket "whatsapp-midia" tem sua própria whitelist de mime types, ver
// migração 008, que funciona como segunda camada de validação no upload).
const CONFIG_TIPO: Record<TipoMidia, { prefixo: string | null; fallbackContentType: string }> = {
  imagem: { prefixo: 'image/', fallbackContentType: 'image/jpeg' },
  audio: { prefixo: 'audio/', fallbackContentType: 'audio/ogg' },
  video: { prefixo: 'video/', fallbackContentType: 'video/mp4' },
  documento: { prefixo: null, fallbackContentType: 'application/octet-stream' },
}

export async function baixarEArmazenarMidia(
  admin: SupabaseClient,
  urlOrigem: string,
  tipo: TipoMidia
): Promise<string | null> {
  if (!origemEhSegura(urlOrigem)) return null

  let resposta: Response
  try {
    resposta = await fetch(urlOrigem, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    return null
  }
  if (!resposta.ok) return null

  const tamanhoDeclarado = resposta.headers.get('content-length')
  if (tamanhoDeclarado && Number(tamanhoDeclarado) > TAMANHO_MAXIMO_BYTES) return null

  const bytes = await resposta.arrayBuffer()
  if (bytes.byteLength > TAMANHO_MAXIMO_BYTES) return null

  const { prefixo, fallbackContentType } = CONFIG_TIPO[tipo]
  const contentTypeRecebido = resposta.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  const tipoValido = contentTypeRecebido && contentTypeRecebido !== 'image/svg+xml' && (prefixo === null || contentTypeRecebido.startsWith(prefixo))
  const contentType = tipoValido ? contentTypeRecebido! : fallbackContentType

  const extensao = contentType.split('/')[1]?.split('+')[0] || EXTENSAO_PADRAO[tipo]
  const caminho = `${tipo}/${randomUUID()}.${extensao}`

  const { error } = await admin.storage.from('whatsapp-midia').upload(caminho, bytes, { contentType })
  if (error) return null

  return caminho
}
