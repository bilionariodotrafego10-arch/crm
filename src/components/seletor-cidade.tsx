'use client'

import type { Cidade } from '@/lib/types'

interface SeletorCidadeProps {
  id?: string
  value: string
  cidades: Cidade[]
  onChange: (value: string) => void
}

export function SeletorCidade({ id, value, cidades, onChange }: SeletorCidadeProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">Sem cidade</option>
      {cidades.map((c) => (
        <option key={c.id} value={c.id}>{c.nome} - {c.estado}</option>
      ))}
    </select>
  )
}
