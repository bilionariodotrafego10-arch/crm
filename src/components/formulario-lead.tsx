'use client'

import { useState } from 'react'
import type { Lead, Cidade } from '@/lib/types'
import { todayISO } from '@/lib/date-filters'
import { SeletorCidade } from '@/components/seletor-cidade'

interface FormularioLeadProps {
  lead?: Lead
  cidades: Cidade[]
  onSave: (data: Omit<Lead, 'id' | 'criado_em' | 'cidade' | 'criado_por'>) => Promise<void>
  onClose: () => void
}

export function FormularioLead({ lead, cidades, onSave, onClose }: FormularioLeadProps) {
  const [form, setForm] = useState({
    nome: lead?.nome ?? '',
    telefone: lead?.telefone ?? '',
    email: lead?.email ?? '',
    data_contato: lead?.data_contato ?? todayISO(),
    status: lead?.status ?? 'nao_respondeu' as Lead['status'],
    status_venda: lead?.status_venda ?? 'negociando' as Lead['status_venda'],
    cidade_id: lead?.cidade_id ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      email: form.email || null,
      cidade_id: form.cidade_id || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-4">
          {lead ? 'Editar Lead' : 'Novo Lead'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Nome *</label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Telefone *</label>
            <input
              required
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Data de Contato *</label>
            <input
              type="date"
              required
              value={form.data_contato}
              onChange={(e) => setForm({ ...form, data_contato: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Status *</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Lead['status'] })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="nao_respondeu">Não Respondeu</option>
              <option value="respondeu">Respondeu</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Negociação *</label>
            <select
              value={form.status_venda}
              onChange={(e) => setForm({ ...form, status_venda: e.target.value as Lead['status_venda'] })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="negociando">Em negociação</option>
              <option value="pago">Pago</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Cidade</label>
            <SeletorCidade value={form.cidade_id} cidades={cidades} onChange={(v) => setForm({ ...form, cidade_id: v })} />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
