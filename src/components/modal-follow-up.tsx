'use client'

import { useState } from 'react'
import { todayISO, formatDateBR } from '@/lib/date-filters'
import type { FollowUp } from '@/lib/types'

interface ModalFollowUpProps {
  leadNome: string
  followUps: FollowUp[]
  onSave: (data: { data: string; observacao: string }) => Promise<void>
  onClose: () => void
}

export function ModalFollowUp({ leadNome, followUps, onSave, onClose }: ModalFollowUpProps) {
  const [form, setForm] = useState({ data: todayISO(), observacao: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setForm({ data: todayISO(), observacao: '' })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-1">Follow-up</h2>
        <p className="text-sm text-muted-foreground mb-4">{leadNome}</p>

        <form onSubmit={handleSubmit} className="space-y-3 mb-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Data da interação</label>
            <input
              type="date"
              required
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Observação</label>
            <textarea
              required
              rows={3}
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              placeholder="O que foi conversado..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>

        {followUps.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground">Histórico</p>
            {followUps.map((fu) => (
              <div key={fu.id} className="text-sm">
                <span className="font-medium text-foreground">{formatDateBR(fu.data)}</span>
                <span className="text-muted-foreground ml-2">{fu.observacao}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
