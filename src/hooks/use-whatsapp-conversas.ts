'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WhatsappConversa } from '@/lib/types'

export function useWhatsappConversas() {
  const [conversas, setConversas] = useState<WhatsappConversa[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchConversas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('whatsapp_conversas')
      .select('*, instancia:whatsapp_instancias(id, apelido, telefone, ativo), lead:leads(id, nome)')
      .order('ultima_mensagem_em', { ascending: false })
    setConversas(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchConversas() }, [fetchConversas])

  useEffect(() => {
    const canal = supabase
      .channel('whatsapp_conversas_lista')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversas' }, () => { fetchConversas() })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, fetchConversas])

  return { conversas, loading, refetch: fetchConversas }
}
