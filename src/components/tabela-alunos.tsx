'use client'

import { useState } from 'react'
import type { Aluno } from '@/lib/types'
import { formatDateBR } from '@/lib/date-filters'

interface TabelaAlunosProps {
  alunos: Aluno[]
  onEdit: (aluno: Aluno) => void
  onDelete: (id: string) => void
}

const PAGE_SIZE = 20

export function TabelaAlunos({ alunos, onEdit, onDelete }: TabelaAlunosProps) {
  const [pagina, setPagina] = useState(1)
  const total = alunos.length
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const paginados = alunos.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Nome', 'Telefone', 'Email', 'Curso', 'Data de Matrícula', 'Ações'].map((col) => (
                <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum aluno cadastrado
                </td>
              </tr>
            )}
            {paginados.map((aluno) => (
              <tr key={aluno.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{aluno.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{aluno.telefone}</td>
                <td className="px-4 py-3 text-muted-foreground">{aluno.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{aluno.curso}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateBR(aluno.data_matricula)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(aluno)} className="text-xs px-2 py-1 rounded border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      Editar
                    </button>
                    <button onClick={() => onDelete(aluno.id)} className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                      Deletar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} alunos</span>
          <div className="flex gap-2">
            <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors">Anterior</button>
            <span className="px-3 py-1">{pagina} / {totalPaginas}</span>
            <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-40 transition-colors">Próximo</button>
          </div>
        </div>
      )}
    </div>
  )
}
