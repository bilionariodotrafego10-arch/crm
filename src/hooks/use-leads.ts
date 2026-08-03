'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Lead } from '@/lib/types'

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('*, cidade:cidades(id, nome, estado)')
      .order('data_contato', { ascending: false })
    setLeads(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const createLead = async (lead: Omit<Lead, 'id' | 'criado_em' | 'cidade'> & { criado_por: string }) => {
    const { error } = await supabase.from('leads').insert(lead)
    if (!error) await fetchLeads()
    return { error }
  }

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error } = await supabase.from('leads').update(updates).eq('id', id)
    if (!error) await fetchLeads()
    return { error }
  }

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (!error) await fetchLeads()
    return { error }
  }

  return { leads, loading, createLead, updateLead, deleteLead, refetch: fetchLeads }
}
