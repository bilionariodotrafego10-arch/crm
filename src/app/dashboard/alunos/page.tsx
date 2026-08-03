'use client'

import { useState } from 'react'
import { useAlunos } from '@/hooks/use-alunos'
import { FormularioAluno } from '@/components/formulario-aluno'
import { TabelaAlunos } from '@/components/tabela-alunos'
import { BotaoExportarCSV } from '@/components/botao-exportar-csv'
import type { Aluno } from '@/lib/types'

export default function AlunosPage() {
  const { alunos, loading, createAluno, updateAluno, deleteAluno } = useAlunos()
  const [modalAberto, setModalAberto] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | undefined>()

  const dadosCSV = alunos.map((a) => ({
    nome: a.nome,
    telefone: a.telefone,
    email: a.email,
  }))

  const nomeArquivoCSV = `alunos-${new Date().toISOString().split('T')[0]}.csv`

  const handleSave = async (data: Omit<Aluno, 'id' | 'criado_em' | 'criado_por'>) => {
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
        <div className="flex gap-2">
          <BotaoExportarCSV
            dados={dadosCSV}
            colunas={['nome', 'telefone', 'email']}
            nomeArquivo={nomeArquivoCSV}
          />
          <button
            onClick={() => { setAlunoEditando(undefined); setModalAberto(true) }}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Novo Aluno
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <TabelaAlunos
          alunos={alunos}
          onEdit={(aluno) => { setAlunoEditando(aluno); setModalAberto(true) }}
          onDelete={deleteAluno}
        />
      )}

      {modalAberto && (
        <FormularioAluno
          aluno={alunoEditando}
          onSave={handleSave}
          onClose={() => { setModalAberto(false); setAlunoEditando(undefined) }}
        />
      )}
    </div>
  )
}
