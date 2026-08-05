'use client'

import { useState } from 'react'
import { criarInstanciaWhatsapp, removerInstanciaWhatsapp } from '@/app/dashboard/config/actions'
import type { WhatsappInstancia } from '@/lib/types'

interface FormularioInstanciaProps {
  instancias: WhatsappInstancia[]
  onChange: () => void
}

export function FormularioInstancia({ instancias, onChange }: FormularioInstanciaProps) {
  const [mensagem, setMensagem] = useState('')
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)

  const handleCriar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const resultado = await criarInstanciaWhatsapp(formData)
    if (resultado.error) {
      setMensagem(`Erro: ${resultado.error}`)
      setWebhookUrl(null)
    } else {
      setMensagem('Número adicionado! Cole a URL abaixo no painel da Z-API, em "Webhook ao receber".')
      setWebhookUrl(resultado.webhookUrl)
      form.reset()
      onChange()
    }
  }

  const handleRemover = async (id: string) => {
    if (!confirm('Remover este número? As conversas continuam salvas, mas ele deixa de enviar/receber.')) return
    await removerInstanciaWhatsapp(id)
    onChange()
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">WhatsApp</h2>

      {mensagem && (
        <div className="p-3 rounded-md bg-primary/10 border border-primary/20 space-y-1">
          <p className="text-sm text-foreground">{mensagem}</p>
          {webhookUrl && (
            <code className="block text-xs break-all bg-background rounded p-2 border border-border">{webhookUrl}</code>
          )}
        </div>
      )}

      <form onSubmit={handleCriar} className="space-y-2">
        <input name="apelido" required placeholder="Apelido (ex: WhatsApp Nathan)" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="telefone" required placeholder="Telefone (ex: 5511999999999)" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="instanceId" required placeholder="Instance ID da Z-API" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="token" required placeholder="Token da instância" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="clientToken" required placeholder="Client-Token da conta Z-API" className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Adicionar número
        </button>
      </form>

      <div className="rounded-lg border border-border divide-y divide-border">
        {instancias.map((i) => (
          <div key={i.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{i.apelido}</p>
              <p className="text-xs text-muted-foreground">{i.telefone} — {i.ativo ? 'ativo' : 'inativo'}</p>
            </div>
            <button
              onClick={() => handleRemover(i.id)}
              className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
