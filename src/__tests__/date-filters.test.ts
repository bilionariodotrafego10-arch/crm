import { getDateRange } from '@/lib/date-filters'

describe('getDateRange', () => {
  it('retorna range de 7 dias', () => {
    const { start, end } = getDateRange('7dias')
    const diffMs = end.getTime() - start.getTime()
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDias).toBe(7)
  })

  it('retorna range de 14 dias', () => {
    const { start, end } = getDateRange('14dias')
    const diffDias = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDias).toBe(14)
  })

  it('retorna range de 30 dias', () => {
    const { start, end } = getDateRange('30dias')
    const diffDias = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDias).toBe(30)
  })

  it('retorna null para filtro "todos"', () => {
    const result = getDateRange('todos')
    expect(result).toBeNull()
  })
})
