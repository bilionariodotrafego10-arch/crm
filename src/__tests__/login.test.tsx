import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/login/page'

// Mock do Server Action
jest.mock('@/app/login/actions', () => ({
  signIn: jest.fn(),
}))

describe('LoginPage', () => {
  it('renderiza campos de email e senha', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('renderiza botão de entrar', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('mostra mensagem de erro quando passada via searchParams', () => {
    render(<LoginPage searchParams={{ error: 'Credenciais inválidas' }} />)
    expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument()
  })
})
