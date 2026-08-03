'use client'

import { useState } from 'react'
import type { Aluno } from '@/lib/types'
import { todayISO } from '@/lib/date-filters'

interface FormularioAlunoProps {
  aluno?: Aluno
  onSave: (data: Omit<Aluno, 'id' | 'criado_em' | 'criado_por'>) => Promise<void>
  onClose: () => void
}

export function FormularioAluno({ aluno, onSave, onClose }: FormularioAlunoProps) {
  const [form, setForm] = useState({
    nome: aluno?.nome ?? '',
    telefone: aluno?.telefone ?? '',
    email: aluno?.email ?? '',
    data_matricula: aluno?.data_matricula ?? todayISO(),
    curso: aluno?.curso ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-4">
          {aluno ? 'Editar Aluno' : 'Novo Aluno'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {(['nome', 'telefone', 'email', 'curso'] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-sm font-medium text-foreground capitalize">
                {field === 'nome' ? 'Nome *' : field === 'telefone' ? 'Telefone *' : field === 'email' ? 'Email *' : 'Curso *'}
              </label>
              <input
                required
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Data de Matrícula *</label>
            <input
              type="date"
              required
              value={form.data_matricula}
              onChange={(e) => setForm({ ...form, data_matricula: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
