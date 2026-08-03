'use client'

import type { DateFilter } from '@/lib/date-filters'

interface BarraFiltrosProps {
  filtroData: DateFilter
  filtroStatus: 'todos' | 'respondeu' | 'nao_respondeu'
  dataInicio?: string
  dataFim?: string
  onFilterChange: (filtros: {
    filtroData: DateFilter
    filtroStatus: 'todos' | 'respondeu' | 'nao_respondeu'
    dataInicio?: string
    dataFim?: string
  }) => void
}

export function BarraFiltros({ filtroData, filtroStatus, dataInicio, dataFim, onFilterChange }: BarraFiltrosProps) {
  const dateOptions: { value: DateFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: '7dias', label: 'Últimos 7 dias' },
    { value: '14dias', label: 'Últimos 14 dias' },
    { value: '30dias', label: 'Último mês' },
    { value: 'personalizado', label: 'Personalizado' },
  ]

  const statusOptions = [
    { value: 'todos' as const, label: 'Todos' },
    { value: 'respondeu' as const, label: 'Respondeu' },
    { value: 'nao_respondeu' as const, label: 'Não Respondeu' },
  ]

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Período</label>
        <select
          value={filtroData}
          onChange={(e) => onFilterChange({ filtroData: e.target.value as DateFilter, filtroStatus, dataInicio, dataFim })}
          className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {dateOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {filtroData === 'personalizado' && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <input
              type="date"
              value={dataInicio ?? ''}
              onChange={(e) => onFilterChange({ filtroData, filtroStatus, dataInicio: e.target.value, dataFim })}
              className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <input
              type="date"
              value={dataFim ?? ''}
              onChange={(e) => onFilterChange({ filtroData, filtroStatus, dataInicio, dataFim: e.target.value })}
              className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </>
      )}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Status</label>
        <select
          value={filtroStatus}
          onChange={(e) => onFilterChange({ filtroData, filtroStatus: e.target.value as typeof filtroStatus, dataInicio, dataFim })}
          className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
