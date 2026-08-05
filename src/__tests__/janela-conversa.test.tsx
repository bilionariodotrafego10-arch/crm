import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JanelaConversa } from '@/components/whatsapp/janela-conversa'
import type { WhatsappConversa } from '@/lib/types'

const mockUseWhatsappMensagens = jest.fn()
jest.mock('@/hooks/use-whatsapp-mensagens', () => ({
  useWhatsappMensagens: (conversaId: string | null) => mockUseWhatsappMensagens(conversaId),
}))

const mockEnviarTexto = jest.fn()
const mockEnviarMidia = jest.fn()
jest.mock('@/app/dashboard/whatsapp/actions', () => ({
  enviarMensagemTexto: (formData: FormData) => mockEnviarTexto(formData),
  enviarMensagemMidia: (formData: FormData) => mockEnviarMidia(formData),
}))

const conversaSemLead: WhatsappConversa = {
  id: 'c1', instancia_id: 'i1', telefone_contato: '5511999998888', nome_contato: 'Maria',
  lead_id: null, ultima_mensagem_em: '2026-08-04T10:00:00Z', criado_em: '2026-08-04T09:00:00Z',
}

const conversaComLead: WhatsappConversa = {
  ...conversaSemLead, id: 'c2', lead_id: 'l1', lead: { id: 'l1', nome: 'João Silva' },
}

describe('JanelaConversa', () => {
  beforeEach(() => {
    mockUseWhatsappMensagens.mockReturnValue({ mensagens: [], loading: false, refetch: jest.fn() })
    mockEnviarTexto.mockReset()
    mockEnviarMidia.mockReset()
  })

  it('mostra botão "Cadastrar Lead" quando a conversa não tem lead vinculado', () => {
    render(<JanelaConversa conversa={conversaSemLead} onCadastrarLead={jest.fn()} />)
    expect(screen.getByRole('button', { name: /cadastrar lead/i })).toBeInTheDocument()
  })

  it('mostra link "Ver Lead" quando a conversa já tem lead vinculado', () => {
    render(<JanelaConversa conversa={conversaComLead} onCadastrarLead={jest.fn()} />)
    expect(screen.getByText(/ver lead: joão silva/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cadastrar lead/i })).not.toBeInTheDocument()
  })

  it('chama onCadastrarLead ao clicar no botão', async () => {
    const onCadastrarLead = jest.fn()
    const user = userEvent.setup()
    render(<JanelaConversa conversa={conversaSemLead} onCadastrarLead={onCadastrarLead} />)
    await user.click(screen.getByRole('button', { name: /cadastrar lead/i }))
    expect(onCadastrarLead).toHaveBeenCalledTimes(1)
  })

  it('envia mensagem de texto ao submeter o formulário', async () => {
    mockEnviarTexto.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<JanelaConversa conversa={conversaSemLead} onCadastrarLead={jest.fn()} />)

    await user.type(screen.getByPlaceholderText(/digite uma mensagem/i), 'Oi, tudo bem?')
    await user.click(screen.getByRole('button', { name: /enviar/i }))

    expect(mockEnviarTexto).toHaveBeenCalledTimes(1)
    const formDataEnviado = mockEnviarTexto.mock.calls[0][0] as FormData
    expect(formDataEnviado.get('conversaId')).toBe('c1')
    expect(formDataEnviado.get('texto')).toBe('Oi, tudo bem?')
  })

  it('não envia mensagem vazia', async () => {
    const user = userEvent.setup()
    render(<JanelaConversa conversa={conversaSemLead} onCadastrarLead={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: /enviar/i }))
    expect(mockEnviarTexto).not.toHaveBeenCalled()
  })
})
