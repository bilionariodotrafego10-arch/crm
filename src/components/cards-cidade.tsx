'use client'

import type { Cidade, Lead } from '@/lib/types'

interface CardsCidadeProps {
  cidades: Cidade[]
  leads: Lead[]
  cidadeSelecionada: string
  onSelecionar: (cidadeId: string) => void
}

export function CardsCidade({ cidades, leads, cidadeSelecionada, onSelecionar }: CardsCidadeProps) {
  const contagemPorCidade = cidades.reduce<Record<string, number>>((acc, c) => {
    acc[c.id] = leads.filter((l) => l.cidade_id === c.id).length
    return acc
  }, {})

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <button
        onClick={() => onSelecionar('')}
        className={`p-4 rounded-lg border text-left transition-colors ${
          cidadeSelecionada === ''
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:bg-accent'
        }`}
      >
        <p className="text-sm font-medium text-foreground">Todas as cidades</p>
        <p className="text-2xl font-bold text-foreground mt-1">
          {leads.filter((l) => l.cidade_id).length}
        </p>
        <p className="text-xs text-muted-foreground">leads com cidade</p>
      </button>

      {cidades.map((cidade) => (
        <button
          key={cidade.id}
          onClick={() => onSelecionar(cidade.id)}
          className={`p-4 rounded-lg border text-left transition-colors ${
            cidadeSelecionada === cidade.id
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:bg-accent'
          }`}
        >
          <p className="text-sm font-medium text-foreground">{cidade.nome}</p>
          <p className="text-xs text-muted-foreground mb-1">{cidade.estado}</p>
          <p className="text-2xl font-bold text-foreground">{contagemPorCidade[cidade.id] ?? 0}</p>
          <p className="text-xs text-muted-foreground">leads</p>
        </button>
      ))}
    </div>
  )
}
