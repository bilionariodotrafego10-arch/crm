import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModalCadastrarLead } from '@/components/whatsapp/modal-cadastrar-lead'

const mockCadastrar = jest.fn()
jest.mock('@/app/dashboard/whatsapp/actions', () => ({
  cadastrarLeadDaConversa: (conversaId: string, dados: unknown) => mockCadastrar(conversaId, dados),
}))

describe('ModalCadastrarLead', () => {
  beforeEach(() => mockCadastrar.mockReset())

  it('pré-preenche o telefone (desabilitado) e o nome sugerido', () => {
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido="Maria" onSaved={jest.fn()} onClose={jest.fn()} />)
    expect(screen.getByDisplayValue('5511999998888')).toBeDisabled()
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument()
  })

  it('ao salvar com sucesso, chama cadastrarLeadDaConversa e onSaved', async () => {
    mockCadastrar.mockResolvedValue({ error: null })
    const onSaved = jest.fn()
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} onSaved={onSaved} onClose={jest.fn()} />)

    await user.type(screen.getByLabelText(/nome/i), 'Maria Souza')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(mockCadastrar).toHaveBeenCalledWith('c1', { nome: 'Maria Souza', email: null })
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('mostra mensagem de erro fixa quando falha', async () => {
    mockCadastrar.mockResolvedValue({ error: 'RLS negou' })
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} onSaved={jest.fn()} onClose={jest.fn()} />)

    await user.type(screen.getByLabelText(/nome/i), 'Maria')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Não foi possível cadastrar o lead. Tente novamente.')).toBeInTheDocument()
  })

  it('chama onClose ao clicar em Cancelar', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} onSaved={jest.fn()} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
