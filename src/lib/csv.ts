export function generateCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T)[]
): string {
  const BOM = '﻿'
  const header = columns.join(',')

  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const rawValue = String(row[col] ?? '')
        // Mitigação OWASP para CSV Injection: valores que começam com
        // caracteres interpretados como início de fórmula pelo Excel/Sheets
        // (=, +, -, @, tab, CR) recebem um apóstrofo neutralizador antes.
        const value = /^[=+\-@\t\r]/.test(rawValue) ? `'${rawValue}` : rawValue
        const needsQuoting = /[",\n\r]/.test(value)
        return needsQuoting ? `"${value.replace(/"/g, '""')}"` : value
      })
      .join(',')
  )

  return BOM + [header, ...dataRows].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
