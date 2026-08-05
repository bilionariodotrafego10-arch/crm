'use client'

import { useState, useRef } from 'react'
import { useWhatsappMensagens } from '@/hooks/use-whatsapp-mensagens'
import { enviarMensagemTexto, enviarMensagemMidia } from '@/app/dashboard/whatsapp/actions'
import { BolhaMensagem } from './bolha-mensagem'
import type { WhatsappConversa } from '@/lib/types'

interface JanelaConversaProps {
  conversa: WhatsappConversa
  onCadastrarLead: () => void
}

export function JanelaConversa({ conversa, onCadastrarLead }: JanelaConversaProps) {
  const { mensagens, loading, refetch } = useWhatsappMensagens(conversa.id)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const inputArquivoRef = useRef<HTMLInputElement>(null)

  const handleEnviarTexto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    try {
      const formData = new FormData()
      formData.set('conversaId', conversa.id)
      formData.set('texto', texto)
      const resultado = await enviarMensagemTexto(formData)
      if (resultado?.error) {
        setErro('Não foi possível enviar a mensagem. Tente novamente.')
      } else {
        setErro(null)
        setTexto('')
      }
    } catch {
      setErro('Não foi possível enviar a mensagem. Tente novamente.')
    } finally {
      setEnviando(false)
      await refetch()
    }
  }

  const handleAnexar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setEnviando(true)
    try {
      const tipo = arquivo.type.startsWith('image/') ? 'imagem' : 'audio'
      const formData = new FormData()
      formData.set('conversaId', conversa.id)
      formData.set('tipo', tipo)
      formData.set('arquivo', arquivo)
      const resultado = await enviarMensagemMidia(formData)
      setErro(resultado?.error ? 'Não foi possível enviar a mídia. Tente novamente.' : null)
    } catch {
      setErro('Não foi possível enviar a mídia. Tente novamente.')
    } finally {
      setEnviando(false)
      if (inputArquivoRef.current) inputArquivoRef.current.value = ''
      await refetch()
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{conversa.lead?.nome ?? conversa.nome_contato ?? conversa.telefone_contato}</p>
          <p className="text-xs text-muted-foreground">{conversa.telefone_contato}</p>
        </div>
        {conversa.lead ? (
          <a href="/dashboard/follow-up" className="text-xs text-primary hover:underline">Ver Lead: {conversa.lead.nome}</a>
        ) : (
          <button onClick={onCadastrarLead} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            Cadastrar Lead
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          mensagens.map((m) => <BolhaMensagem key={m.id} mensagem={m} />)
        )}
      </div>

      {erro && (
        <div className="mx-3 mb-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{erro}</p>
        </div>
      )}

      <form onSubmit={handleEnviarTexto} className="p-3 border-t border-border flex gap-2 items-center">
        <input
          ref={inputArquivoRef}
          type="file"
          accept="image/*,audio/*"
          onChange={handleAnexar}
          className="hidden"
          id="anexo-whatsapp"
        />
        <label htmlFor="anexo-whatsapp" className="px-3 py-2 rounded-md border border-input text-sm cursor-pointer hover:bg-accent transition-colors">
          📎
        </label>
        <input
          value={texto}
          onChange={(e) => { setTexto(e.target.value); if (erro) setErro(null) }}
          placeholder="Digite uma mensagem..."
          className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" disabled={enviando} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          Enviar
        </button>
      </form>
    </div>
  )
}
