'use client'

import { useState, useMemo } from 'react'
import { useAlunos } from '@/hooks/use-alunos'
import { useCidades } from '@/hooks/use-cidades'
import { FormularioAluno } from '@/components/formulario-aluno'
import { TabelaAlunos } from '@/components/tabela-alunos'
import { BotaoExportarCSV } from '@/components/botao-exportar-csv'
import type { Aluno } from '@/lib/types'

export default function AlunosPage() {
  const { alunos, loading, createAluno, updateAluno, deleteAluno } = useAlunos()
  const { cidades } = useCidades()
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | undefined>()
  const [filtroCidadeId, setFiltroCidadeId] = useState<string | 'todas'>('todas')

  const alunosFiltrados = useMemo(() => {
    if (filtroCidadeId === 'todas') return alunos
    return alunos.filter((a) => a.cidade_id === filtroCidadeId)
  }, [alunos, filtroCidadeId])

  const dadosCSV = alunosFiltrados.map((a) => ({
    nome: a.nome,
    telefone: a.telefone,
    email: a.email,
    cidade: a.cidade?.nome ?? '',
  }))

  const nomeArquivoCSV = `alunos-${new Date().toISOString().split('T')[0]}.csv`

  const handleSave = async (data: Omit<Aluno, 'id' | 'criado_em' | 'criado_por' | 'cidade'>) => {
    if (alunoEditando) {
      await updateAluno(alunoEditando.id, data)
    } else {
      await createAluno(data)
    }
    setAlunoEditando(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
        <button
          onClick={() => { setAlunoEditando(undefined); setModalAberto(true) }}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Novo Aluno
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Cidade</label>
          <select
            value={filtroCidadeId}
            onChange={(e) => setFiltroCidadeId(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="todas">Todas</option>
            {cidades.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} - {c.estado}</option>
            ))}
          </select>
        </div>
        <BotaoExportarCSV
          dados={dadosCSV}
          colunas={['nome', 'telefone', 'email', 'cidade']}
          nomeArquivo={nomeArquivoCSV}
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <TabelaAlunos
          alunos={alunosFiltrados}
          onEdit={(aluno) => { setAlunoEditando(aluno); setModalAberto(true) }}
          onDelete={deleteAluno}
        />
      )}

      {modalAberto && (
        <FormularioAluno
          aluno={alunoEditando}
          cidades={cidades}
          onSave={handleSave}
          onClose={() => { setModalAberto(false); setAlunoEditando(undefined) }}
        />
      )}
    </div>
  )
}
