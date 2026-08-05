import { randomUUID } from 'crypto'
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

  const partesIPv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (partesIPv4) {
    const a = Number(partesIPv4[1])
    const b = Number(partesIPv4[2])
    if (a === 127 || a === 10 || a === 0) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 169 && b === 254) return false
  }
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false

  return true
}

export async function baixarEArmazenarMidia(
  admin: SupabaseClient,
  urlOrigem: string,
  tipo: 'imagem' | 'audio'
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

  const contentTypeRecebido = resposta.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  const prefixoEsperado = tipo === 'imagem' ? 'image/' : 'audio/'
  const contentType = contentTypeRecebido?.startsWith(prefixoEsperado)
    ? contentTypeRecebido
    : (tipo === 'imagem' ? 'image/jpeg' : 'audio/ogg')

  const extensao = contentType.split('/')[1]?.split('+')[0] || (tipo === 'imagem' ? 'jpg' : 'ogg')
  const caminho = `${tipo}/${randomUUID()}.${extensao}`

  const { error } = await admin.storage.from('whatsapp-midia').upload(caminho, bytes, { contentType })
  if (error) return null

  return caminho
}
