export function generateCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: (keyof T)[]
): string {
  const BOM = '﻿'
  const header = columns.join(',')

  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const value = String(row[col] ?? '')
        return value.includes(',') ? `"${value}"` : value
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
