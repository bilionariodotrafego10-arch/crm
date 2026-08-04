import { render, screen } from '@testing-library/react'
import SignupPage from '@/app/signup/page'

// Mock do Server Action
jest.mock('@/app/signup/actions', () => ({
  signUp: jest.fn(),
}))

describe('SignupPage', () => {
  it('renderiza campos de email, senha e confirmar senha', () => {
    render(<SignupPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument()
  })

  it('renderiza botão de cadastrar', () => {
    render(<SignupPage />)
    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument()
  })

  it('renderiza link para a página de login', () => {
    render(<SignupPage />)
    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/login')
  })

  it('mostra mensagem de erro fixa quando senhas não coincidem', () => {
    render(<SignupPage searchParams={{ error: 'senha_diferente' }} />)
    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument()
  })

  it('mostra mensagem de erro fixa quando senha é muito curta', () => {
    render(<SignupPage searchParams={{ error: 'senha_curta' }} />)
    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument()
  })

  it('mostra mensagem de erro genérica fixa para outras falhas', () => {
    render(<SignupPage searchParams={{ error: '1' }} />)
    expect(screen.getByText('Não foi possível criar a conta. Tente novamente.')).toBeInTheDocument()
  })

  it('mostra mensagem de erro genérica fixa para chaves de prototype do Object (não quebra)', () => {
    render(<SignupPage searchParams={{ error: 'constructor' }} />)
    expect(screen.getByText('Não foi possível criar a conta. Tente novamente.')).toBeInTheDocument()
  })
})
