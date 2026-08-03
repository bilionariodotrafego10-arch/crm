'use client'

import { useState } from 'react'
import type { Lead, Cidade } from '@/lib/types'
import { formatDateBR } from '@/lib/date-filters'
import { ModalFollowUp } from './modal-follow-up'
import { useFollowUps } from '@/hooks/use-follow-ups'

interface TabelaLeadsProps {
  leads: Lead[]
  cidades: Cidade[]
  onEdit: (lead: Lead) => void
  onDelete: (id: string) => void
}

const PAGE_SIZE = 20

function FollowUpCell({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false)
  const { followUps, createFollowUp } = useFollowUps(lead.id)

  const handleSave = async (data: { data: string; observacao: string }) => {
    await createFollowUp(data)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 rounded border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        Follow-up {followUps.length > 0 && `(${followUps.length})`}
      </button>
      {open && (
        <ModalFollowUp
          leadNome={lead.nome}
          followUps={followUps}
          onSave={handleSave}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export function TabelaLeads({ leads, onEdit, onDelete }: TabelaLeadsProps) {
  const [pagina, setPagina] = useState(1)
  const total = leads.length
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginados = leads.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Nome', 'Telefone', 'Data de Contato', 'Status', 'Cidade', 'Ações'].map((col) => (
                <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum lead encontrado
                </td>
              </tr>
            )}
            {paginados.map((lead) => (
              <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{lead.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.telefone}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateBR(lead.data_contato)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    lead.status === 'respondeu'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {lead.status === 'respondeu' ? 'Respondeu' : 'Não Respondeu'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lead.cidade ? `${lead.cidade.nome} - ${lead.cidade.estado}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(lead)}
                      className="text-xs px-2 py-1 rounded border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(lead.id)}
                      className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Deletar
                    </button>
                    <FollowUpCell lead={lead} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} leads</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <span className="px-3 py-1">{pagina} / {totalPaginas}</span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
