import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AceitarConvitePage from '@/app/aceitar-convite/page'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockGetSession = jest.fn()
const mockSetSession = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () => mockGetSession(),
      setSession: (tokens: unknown) => mockSetSession(tokens),
    },
  }),
}))

const mockTrocarSenha = jest.fn()
jest.mock('@/app/dashboard/config/actions', () => ({
  trocarSenha: (formData: FormData) => mockTrocarSenha(formData),
}))

describe('AceitarConvitePage', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockTrocarSenha.mockReset()
    mockGetSession.mockReset()
    mockSetSession.mockReset()
    window.location.hash = ''
  })

  it('mostra estado de carregamento antes de processar o convite', () => {
    window.location.hash = '#access_token=abc&refresh_token=def&type=invite'
    mockSetSession.mockReturnValue(new Promise(() => {})) // nunca resolve
    render(<AceitarConvitePage />)
    expect(screen.getByText(/verificando/i)).toBeInTheDocument()
  })

  it('extrai os tokens do fragmento da URL e chama setSession', async () => {
    window.location.hash = '#access_token=token-abc&refresh_token=token-def&type=invite'
    mockSetSession.mockResolvedValue({ data: { session: { access_token: 'token-abc' } } })
    render(<AceitarConvitePage />)
    await screen.findByLabelText(/^nova senha$/i)
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'token-abc',
      refresh_token: 'token-def',
    })
  })

  it('mostra formulário de nova senha quando o convite é válido', async () => {
    window.location.hash = '#access_token=abc&refresh_token=def&type=invite'
    mockSetSession.mockResolvedValue({ data: { session: { access_token: 'abc' } } })
    render(<AceitarConvitePage />)
    expect(await screen.findByLabelText(/^nova senha$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /definir senha/i })).toBeInTheDocument()
  })

  it('remove os tokens do fragmento da URL depois de processar o convite', async () => {
    window.location.hash = '#access_token=abc&refresh_token=def&type=invite'
    mockSetSession.mockResolvedValue({ data: { session: { access_token: 'abc' } } })
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState')
    render(<AceitarConvitePage />)
    await screen.findByLabelText(/^nova senha$/i)
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', window.location.pathname)
    replaceStateSpy.mockRestore()
  })

  it('mostra mensagem de link inválido quando não há tokens no fragmento nem sessão existente', async () => {
    window.location.hash = ''
    mockGetSession.mockResolvedValue({ data: { session: null } })
    render(<AceitarConvitePage />)
    expect(await screen.findByText(/link inválido ou expirado/i)).toBeInTheDocument()
  })

  it('mostra mensagem de link inválido quando o setSession falha', async () => {
    window.location.hash = '#access_token=abc&refresh_token=def&type=invite'
    mockSetSession.mockResolvedValue({ data: { session: null } })
    render(<AceitarConvitePage />)
    expect(await screen.findByText(/link inválido ou expirado/i)).toBeInTheDocument()
  })

  it('mostra mensagem de link inválido em vez de travar quando setSession rejeita (erro de rede)', async () => {
    window.location.hash = '#access_token=abc&refresh_token=def&type=invite'
    mockSetSession.mockRejectedValue(new Error('falha de rede'))
    render(<AceitarConvitePage />)
    expect(await screen.findByText(/link inválido ou expirado/i)).toBeInTheDocument()
  })

  it('mostra erro fixo quando as senhas não coincidem', async () => {
    window.location.hash = '#access_token=abc&refresh_token=def&type=invite'
    mockSetSession.mockResolvedValue({ data: { session: { access_token: 'abc' } } })
    const user = userEvent.setup()
    render(<AceitarConvitePage />)

    await user.type(await screen.findByLabelText(/^nova senha$/i), 'senha123')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'outrasenha')
    await user.click(screen.getByRole('button', { name: /definir senha/i }))

    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument()
    expect(mockTrocarSenha).not.toHaveBeenCalled()
  })

  it('chama trocarSenha e redireciona para o dashboard quando bem-sucedido', async () => {
    window.location.hash = '#access_token=abc&refresh_token=def&type=invite'
    mockSetSession.mockResolvedValue({ data: { session: { access_token: 'abc' } } })
    mockTrocarSenha.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<AceitarConvitePage />)

    await user.type(await screen.findByLabelText(/^nova senha$/i), 'senha123')
    await user.type(screen.getByLabelText(/confirmar senha/i), 'senha123')
    await user.click(screen.getByRole('button', { name: /definir senha/i }))

    expect(mockTrocarSenha).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })
})
