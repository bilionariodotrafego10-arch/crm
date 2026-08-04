'use client'

import { useState, useMemo } from 'react'
import { useLeads } from '@/hooks/use-leads'
import { useCidades } from '@/hooks/use-cidades'
import { BarraFiltros } from '@/components/barra-filtros'
import { TabelaLeads } from '@/components/tabela-leads'
import { FormularioLead } from '@/components/formulario-lead'
import { getDateRange, type DateFilter } from '@/lib/date-filters'
import type { Lead } from '@/lib/types'

export default function FollowUpPage() {
  const { leads, loading, createLead, updateLead, deleteLead } = useLeads()
  const { cidades } = useCidades()
  const [modalAberto, setModalAberto] = useState(false)
  const [leadEditando, setLeadEditando] = useState<Lead | undefined>()
  const [filtroData, setFiltroData] = useState<DateFilter>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'respondeu' | 'nao_respondeu'>('todos')
  const [dataInicio, setDataInicio] = useState<string>()
  const [dataFim, setDataFim] = useState<string>()

  const leadsFiltrados = useMemo(() => {
    let resultado = leads

    if (filtroData === 'personalizado') {
      if (dataInicio && dataFim) {
        resultado = resultado.filter((l) => l.data_contato >= dataInicio && l.data_contato <= dataFim)
      }
    } else {
      const range = getDateRange(filtroData)
      if (range) {
        resultado = resultado.filter((l) => {
          const data = new Date(l.data_contato + 'T00:00:00')
          return data >= range.start && data <= range.end
        })
      }
    }

    if (filtroStatus !== 'todos') {
      resultado = resultado.filter((l) => l.status === filtroStatus)
    }

    return resultado
  }, [leads, filtroData, filtroStatus, dataInicio, dataFim])

  const handleSave = async (data: Omit<Lead, 'id' | 'criado_em' | 'cidade' | 'criado_por'>) => {
    if (leadEditando) {
      await updateLead(leadEditando.id, data)
    } else {
      await createLead(data)
    }
    setLeadEditando(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Follow-up</h1>
        <button
          onClick={() => { setLeadEditando(undefined); setModalAberto(true) }}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Novo Lead
        </button>
      </div>

      <BarraFiltros
        filtroData={filtroData}
        filtroStatus={filtroStatus}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onFilterChange={({ filtroData: fd, filtroStatus: fs, dataInicio: di, dataFim: df }) => {
          setFiltroData(fd)
          setFiltroStatus(fs)
          setDataInicio(di)
          setDataFim(df)
        }}
      />

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
