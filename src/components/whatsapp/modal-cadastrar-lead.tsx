'use client'

import { useState } from 'react'
import { cadastrarLeadDaConversa } from '@/app/dashboard/whatsapp/actions'

interface ModalCadastrarLeadProps {
  conversaId: string
  telefone: string
  nomeSugerido: string | null
  onSaved: () => void
  onClose: () => void
}

export function ModalCadastrarLead({ conversaId, telefone, nomeSugerido, onSaved, onClose }: ModalCadastrarLeadProps) {
  const [nome, setNome] = useState(nomeSugerido ?? '')
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    const resultado = await cadastrarLeadDaConversa(conversaId, { nome, email: email || null })
    setSalvando(false)
    if (resultado.error) {
      setErro('Não foi possível cadastrar o lead. Tente novamente.')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-foreground mb-4">Cadastrar Lead</h2>

        {erro && (
          <div className="mb-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{erro}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="nome-lead-whatsapp" className="text-sm font-medium text-foreground">Nome *</label>
            <input
              id="nome-lead-whatsapp"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="telefone-lead-whatsapp" className="text-sm font-medium text-foreground">Telefone</label>
            <input
              id="telefone-lead-whatsapp"
              value={telefone}
              disabled
              className="w-full px-3 py-2 rounded-md border border-input bg-muted text-muted-foreground text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email-lead-whatsapp" className="text-sm font-medium text-foreground">Email</label>
            <input
              id="email-lead-whatsapp"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
