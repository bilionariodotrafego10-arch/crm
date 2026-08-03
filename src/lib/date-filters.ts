export type DateFilter = '7dias' | '14dias' | '30dias' | 'personalizado' | 'todos'

export function getDateRange(filter: DateFilter): { start: Date; end: Date } | null {
  if (filter === 'todos' || filter === 'personalizado') return null

  const dias = filter === '7dias' ? 7 : filter === '14dias' ? 14 : 30
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - dias)
  return { start, end }
}

export function formatDateBR(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return d.toLocaleDateString('pt-BR')
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
