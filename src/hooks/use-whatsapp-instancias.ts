'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WhatsappInstancia } from '@/lib/types'

export function useWhatsappInstancias() {
  const [instancias, setInstancias] = useState<WhatsappInstancia[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchInstancias = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('whatsapp_instancias')
      .select('id, apelido, telefone, ativo')
      .order('apelido')
    setInstancias(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchInstancias() }, [fetchInstancias])

  return { instancias, loading, refetch: fetchInstancias }
}
