import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function baixarEArmazenarMidia(
  admin: SupabaseClient,
  urlOrigem: string,
  tipo: 'imagem' | 'audio'
): Promise<string | null> {
  let resposta: Response
  try {
    resposta = await fetch(urlOrigem)
  } catch {
    return null
  }
  if (!resposta.ok) return null

  const bytes = await resposta.arrayBuffer()
  const extensao = tipo === 'imagem' ? 'jpg' : 'ogg'
  const contentType = tipo === 'imagem' ? 'image/jpeg' : 'audio/ogg'
  const caminho = `${tipo}/${randomUUID()}.${extensao}`

  const { error } = await admin.storage.from('whatsapp-midia').upload(caminho, bytes, { contentType })
  if (error) return null

  return caminho
}
