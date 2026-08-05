'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WhatsappMensagem } from '@/lib/types'

export function useWhatsappMensagens(conversaId: string | null) {
  const [mensagens, setMensagens] = useState<WhatsappMensagem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const resolverMidia = useCallback(async (lista: WhatsappMensagem[]) => {
    return Promise.all(
      lista.map(async (m) => {
        if (!m.midia_url) return m
        const { data } = await supabase.storage.from('whatsapp-midia').createSignedUrl(m.midia_url, 3600)
        return data ? { ...m, midia_url: data.signedUrl } : m
      })
    )
  }, [supabase])

  const fetchMensagens = useCallback(async () => {
    if (!conversaId) {
      setMensagens([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: true })
    setMensagens(await resolverMidia(data ?? []))
    setLoading(false)
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
