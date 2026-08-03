'use client'

import { generateCSV, downloadCSV } from '@/lib/csv'

interface BotaoExportarCSVProps<T extends Record<string, unknown>> {
  dados: T[]
  colunas: (keyof T)[]
  nomeArquivo: string
}

export function BotaoExportarCSV<T extends Record<string, unknown>>({
  dados,
  colunas,
  nomeArquivo,
}: BotaoExportarCSVProps<T>) {
  const handleExport = () => {
    const csv = generateCSV(dados, colunas)
    downloadCSV(csv, nomeArquivo)
  }

  return (
    <button
      onClick={handleExport}
      disabled={dados.length === 0}
      className="px-4 py-2 rounded-md border border-input text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Exportar CSV
    </button>
  )
}
