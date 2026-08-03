import { render, screen } from '@testing-library/react'
import { BarraFiltros } from '@/components/barra-filtros'

describe('BarraFiltros', () => {
  it('renderiza opções de filtro de data', () => {
    render(<BarraFiltros filtroData="todos" filtroStatus="todos" onFilterChange={jest.fn()} />)
    expect(screen.getByText('Últimos 7 dias')).toBeInTheDocument()
    expect(screen.getByText('Últimos 14 dias')).toBeInTheDocument()
    expect(screen.getByText('Último mês')).toBeInTheDocument()
    expect(screen.getAllByText('Todos').length).toBeGreaterThan(0)
  })

  it('renderiza filtros de status', () => {
    render(<BarraFiltros filtroData="todos" filtroStatus="todos" onFilterChange={jest.fn()} />)
    expect(screen.getByText('Respondeu')).toBeInTheDocument()
    expect(screen.getByText('Não Respondeu')).toBeInTheDocument()
  })
})
