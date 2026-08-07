'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Aluno } from '@/lib/types'

export function useAlunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAlunos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('alunos')
      .select('*, cidade:cidades(id, nome, estado)')
      .order('data_matricula', { ascending: false })
    setAlunos(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAlunos() }, [fetchAlunos])

  const createAluno = async (aluno: Omit<Aluno, 'id' | 'criado_em' | 'criado_por' | 'cidade'>) => {
    const { error } = await supabase.from('alunos').insert(aluno)
    if (!error) await fetchAlunos()
    return { error }
  }

  const updateAluno = async (id: string, updates: Partial<Omit<Aluno, 'id' | 'criado_em' | 'criado_por' | 'cidade'>>) => {
    const { error } = await supabase.from('alunos').update(updates).eq('id', id)
    if (!error) await fetchAlunos()
    return { error }
  }

  const deleteAluno = async (id: string) => {
    const { error } = await supabase.from('alunos').delete().eq('id', id)
    if (!error) await fetchAlunos()
    return { error }
  }

  return { alunos, loading, createAluno, updateAluno, deleteAluno, refetch: fetchAlunos }
}
