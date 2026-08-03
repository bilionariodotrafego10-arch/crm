'use client'

import { useState, useMemo } from 'react'
import { useLeads } from '@/hooks/use-leads'
import { useCidades } from '@/hooks/use-cidades'
import { CardsCidade } from '@/components/cards-cidade'
import { TabelaLeads } from '@/components/tabela-leads'
import { FormularioLead } from '@/components/formulario-lead'
import { BotaoExportarCSV } from '@/components/botao-exportar-csv'
import type { Lead } from '@/lib/types'

export default function CidadesPage() {
  const { leads, loading, createLead, updateLead, deleteLead } = useLeads()
  const { cidades } = useCidades()
  const [cidadeSelecionada, setCidadeSelecionada] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [leadEditando, setLeadEditando] = useState<Lead | undefined>()

  const leadsComCidade = useMemo(
    () => leads.filter((l) => l.cidade_id),
    [leads]
  )

  const leadsFiltrados = useMemo(() => {
    if (!cidadeSelecionada) return leadsComCidade
    return leadsComCidade.filter((l) => l.cidade_id === cidadeSelecionada)
  }, [leadsComCidade, cidadeSelecionada])

  const cidadeAtual = cidades.find((c) => c.id === cidadeSelecionada)

  const dadosCSV = leadsFiltrados.map((l) => ({
    nome: l.nome,
    telefone: l.telefone,
    email: l.email ?? '',
  }))

  const nomeArquivoCSV = cidadeAtual
    ? `leads-${cidadeAtual.nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    : `leads-todas-cidades-${new Date().toISOString().split('T')[0]}.csv`

  const handleSave = async (data: Omit<Lead, 'id' | 'criado_em' | 'cidade' | 'criado_por'>) => {
    if (leadEditando) {
      await updateLead(leadEditando.id, data)
    } else {
      await createLead(data)
    }
    setLeadEditando(undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tráfego por Cidade</h1>
        <button
          onClick={() => { setLeadEditando(undefined); setModalAberto(true) }}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Novo Lead
        </button>
      </div>

      <CardsCidade
        cidades={cidades}
        leads={leadsComCidade}
        cidadeSelecionada={cidadeSelecionada}
        onSelecionar={setCidadeSelecionada}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {leadsFiltrados.length} leads {cidadeAtual ? `em ${cidadeAtual.nome}` : 'com cidade'}
        </p>
        <BotaoExportarCSV
          dados={dadosCSV}
          colunas={['nome', 'telefone', 'email']}
          nomeArquivo={nomeArquivoCSV}
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <TabelaLeads
          leads={leadsFiltrados}
          cidades={cidades}
          onEdit={(lead) => { setLeadEditando(lead); setModalAberto(true) }}
          onDelete={deleteLead}
        />
      )}

      {modalAberto && (
        <FormularioLead
          lead={leadEditando}
          cidades={cidades}
          onSave={handleSave}
          onClose={() => { setModalAberto(false); setLeadEditando(undefined) }}
        />
      )}
    </div>
  )
}
