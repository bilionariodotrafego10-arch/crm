'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FollowUp } from '@/lib/types'

export function useFollowUps(leadId: string) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchFollowUps = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('lead_id', leadId)
      .order('data', { ascending: false })
    setFollowUps(data ?? [])
    setLoading(false)
  }, [supabase, leadId])

  useEffect(() => { fetchFollowUps() }, [fetchFollowUps])

  const createFollowUp = async (payload: { data: string; observacao: string }) => {
    const { error } = await supabase.from('follow_ups').insert({ ...payload, lead_id: leadId })
    if (!error) await fetchFollowUps()
    return { error }
  }

  return { followUps, loading, createFollowUp }
}
