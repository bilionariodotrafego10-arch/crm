'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WhatsappMensagem } from '@/lib/types'

// TTL da URL assinada gerada pelo Storage (createSignedUrl). O cache é
// considerado válido por um tempo menor que o TTL real (3000s < 3600s) para
// nunca servir, por folga de tempo de execução, uma URL já expirada.
const SIGNED_URL_TTL_SEGUNDOS = 3600
const SIGNED_URL_CACHE_VALIDO_MS = 3000 * 1000

export function useWhatsappMensagens(conversaId: string | null) {
  const [mensagens, setMensagens] = useState<WhatsappMensagem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const conversaIdRef = useRef(conversaId)
  conversaIdRef.current = conversaId
  // Uma mensagem já carregada nunca muda de midia_url (path no bucket), então
  // cachear a URL assinada por path evita gerar (e o browser buscar) uma URL
  // nova a cada refetch/Realtime, mesmo quando nada mudou.
  const cacheUrlAssinada = useRef(new Map<string, { url: string; expiraEm: number }>())
  // Só mostramos o estado de "Carregando..." na primeira carga desta
  // conversa — refetches disparados pelo Realtime ou por um envio não devem
  // apagar a tela inteira.
  const carregouUmaVezRef = useRef<string | null>(null)

  const resolverMidia = useCallback(async (lista: WhatsappMensagem[]) => {
    return Promise.all(
      lista.map(async (m) => {
        if (!m.midia_url) return m
        const cache = cacheUrlAssinada.current.get(m.midia_url)
        if (cache && cache.expiraEm > Date.now()) {
          return { ...m, midia_url: cache.url }
        }
        const { data } = await supabase.storage.from('whatsapp-midia').createSignedUrl(m.midia_url, SIGNED_URL_TTL_SEGUNDOS)
        if (!data) return m
        cacheUrlAssinada.current.set(m.midia_url, { url: data.signedUrl, expiraEm: Date.now() + SIGNED_URL_CACHE_VALIDO_MS })
        return { ...m, midia_url: data.signedUrl }
      })
    )
  }, [supabase])

  const fetchMensagens = useCallback(async () => {
    const idNoMomentoDoFetch = conversaId
    if (!conversaId) {
      setMensagens([])
      setLoading(false)
      return
    }
    if (carregouUmaVezRef.current !== conversaId) {
      setLoading(true)
    }
    const { data } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: true })
    const resolvidas = await resolverMidia(data ?? [])
    if (conversaIdRef.current !== idNoMomentoDoFetch) return
    setMensagens(resolvidas)
    setLoading(false)
    carregouUmaVezRef.current = conversaId
  }, [supabase, conversaId, resolverMidia])

  useEffect(() => { fetchMensagens() }, [fetchMensagens])

  useEffect(() => {
    if (!conversaId) return
    const canal = supabase
      .channel(`whatsapp_mensagens:${conversaId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'whatsapp_mensagens', filter: `conversa_id=eq.${conversaId}`,
      }, () => { fetchMensagens() })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, conversaId, fetchMensagens])

  return { mensagens, loading, refetch: fetchMensagens }
}
