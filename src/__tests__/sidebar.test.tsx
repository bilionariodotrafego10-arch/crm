import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/sidebar'

// Mock do next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/follow-up',
}))

describe('Sidebar', () => {
  it('exibe itens de navegação para vendedor', () => {
    render(<Sidebar role="vendedor" />)
    expect(screen.getByText('Follow-up')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
    expect(screen.getByText('Cidades')).toBeInTheDocument()
    expect(screen.getByText('Alunos')).toBeInTheDocument()
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
  })

  it('exibe Configurações para admin', () => {
    render(<Sidebar role="admin" />)
    expect(screen.getByText('Configurações')).toBeInTheDocument()
  })

  it('exibe botão de sair', () => {
    render(<Sidebar role="vendedor" />)
    expect(screen.getByText('Sair')).toBeInTheDocument()
  })
})
