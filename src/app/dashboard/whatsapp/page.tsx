'use client'

import { useState } from 'react'
import { useWhatsappConversas } from '@/hooks/use-whatsapp-conversas'
import { useWhatsappInstancias } from '@/hooks/use-whatsapp-instancias'
import { ListaConversas } from '@/components/whatsapp/lista-conversas'
import { JanelaConversa } from '@/components/whatsapp/janela-conversa'
import { ModalCadastrarLead } from '@/components/whatsapp/modal-cadastrar-lead'

export default function WhatsappPage() {
  const { conversas, refetch: refetchConversas } = useWhatsappConversas()
  const { instancias } = useWhatsappInstancias()
  const [conversaSelecionadaId, setConversaSelecionadaId] = useState<string | null>(null)
  const [filtroInstanciaId, setFiltroInstanciaId] = useState<string | 'todos'>('todos')
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false)

  const conversaSelecionada = conversas.find((c) => c.id === conversaSelecionadaId) ?? null

  return (
    <div className="h-[calc(100vh-3rem)] -m-6 flex">
      <ListaConversas
        conversas={conversas}
        instancias={instancias}
        conversaSelecionadaId={conversaSelecionadaId}
        filtroInstanciaId={filtroInstanciaId}
        onSelecionar={setConversaSelecionadaId}
        onFiltroChange={setFiltroInstanciaId}
      />

      {conversaSelecionada ? (
        <JanelaConversa
          conversa={conversaSelecionada}
          onCadastrarLead={() => setModalCadastroAberto(true)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Selecione uma conversa
        </div>
      )}

      {modalCadastroAberto && conversaSelecionada && (
        <ModalCadastrarLead
          conversaId={conversaSelecionada.id}
          telefone={conversaSelecionada.telefone_contato}
          nomeSugerido={conversaSelecionada.nome_contato}
          onSaved={() => { setModalCadastroAberto(false); refetchConversas() }}
          onClose={() => setModalCadastroAberto(false)}
        />
      )}
    </div>
  )
}
