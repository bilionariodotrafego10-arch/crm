'use client'

import type { WhatsappConversa, WhatsappInstancia } from '@/lib/types'

interface ListaConversasProps {
  conversas: WhatsappConversa[]
  instancias: WhatsappInstancia[]
  conversaSelecionadaId: string | null
  filtroInstanciaId: string | 'todos'
  onSelecionar: (id: string) => void
  onFiltroChange: (id: string | 'todos') => void
}

export function ListaConversas({
  conversas, instancias, conversaSelecionadaId, filtroInstanciaId, onSelecionar, onFiltroChange,
}: ListaConversasProps) {
  const conversasFiltradas = filtroInstanciaId === 'todos'
    ? conversas
    : conversas.filter((c) => c.instancia_id === filtroInstanciaId)

  return (
    <div className="w-72 border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <select
          value={filtroInstanciaId}
          onChange={(e) => onFiltroChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Todos os números</option>
          {instancias.map((i) => (
            <option key={i.id} value={i.id}>{i.apelido}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto divide-y divide-border">
        {conversasFiltradas.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa ainda</p>
        )}
        {conversasFiltradas.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelecionar(c.id)}
            className={`w-full text-left p-3 hover:bg-accent transition-colors ${c.id === conversaSelecionadaId ? 'bg-accent' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {c.lead?.nome ?? c.nome_contato ?? c.telefone_contato}
              </p>
              {c.instancia && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground shrink-0">
                  {c.instancia.apelido}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{c.telefone_contato}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
