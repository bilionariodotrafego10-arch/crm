'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cidade } from '@/lib/types'

export function useCidades() {
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCidades = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('cidades').select('*').order('nome')
    setCidades(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCidades() }, [fetchCidades])

  const createCidade = async (cidade: Omit<Cidade, 'id'>) => {
    const { error } = await supabase.from('cidades').insert(cidade)
    if (!error) await fetchCidades()
    return { error }
  }

  const updateCidade = async (id: string, updates: Partial<Cidade>) => {
    const { error } = await supabase.from('cidades').update(updates).eq('id', id)
    if (!error) await fetchCidades()
    return { error }
  }

  const deleteCidade = async (id: string) => {
    const { error } = await supabase.from('cidades').delete().eq('id', id)
    if (!error) await fetchCidades()
    return { error }
  }

  return { cidades, loading, createCidade, updateCidade, deleteCidade, refetch: fetchCidades }
}
