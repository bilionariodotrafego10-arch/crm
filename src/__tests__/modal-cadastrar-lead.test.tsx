import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModalCadastrarLead } from '@/components/whatsapp/modal-cadastrar-lead'
import type { Cidade } from '@/lib/types'

const mockCadastrar = jest.fn()
jest.mock('@/app/dashboard/whatsapp/actions', () => ({
  cadastrarLeadDaConversa: (conversaId: string, dados: unknown) => mockCadastrar(conversaId, dados),
}))

const cidades: Cidade[] = [{ id: 'cid-1', nome: 'Balneário Camboriú', estado: 'SC' }]

describe('ModalCadastrarLead', () => {
  beforeEach(() => mockCadastrar.mockReset())

  it('pré-preenche o telefone (desabilitado) e o nome sugerido', () => {
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido="Maria" cidades={cidades} onSaved={jest.fn()} onClose={jest.fn()} />)
    expect(screen.getByDisplayValue('5511999998888')).toBeDisabled()
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument()
  })

  it('ao salvar com sucesso, chama cadastrarLeadDaConversa com valores padrão de cidade/negociação e onSaved', async () => {
    mockCadastrar.mockResolvedValue({ error: null })
    const onSaved = jest.fn()
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} cidades={cidades} onSaved={onSaved} onClose={jest.fn()} />)

    await user.type(screen.getByLabelText(/nome/i), 'Maria Souza')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(mockCadastrar).toHaveBeenCalledWith('c1', { nome: 'Maria Souza', email: null, cidade_id: null, status_venda: 'negociando' })
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('envia a cidade e a negociação escolhidas', async () => {
    mockCadastrar.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} cidades={cidades} onSaved={jest.fn()} onClose={jest.fn()} />)

    await user.type(screen.getByLabelText(/nome/i), 'Maria Souza')
    await user.selectOptions(screen.getByLabelText(/cidade/i), 'cid-1')
    await user.selectOptions(screen.getByLabelText(/negociação/i), 'pago')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(mockCadastrar).toHaveBeenCalledWith('c1', { nome: 'Maria Souza', email: null, cidade_id: 'cid-1', status_venda: 'pago' })
  })

  it('mostra mensagem de erro fixa quando falha', async () => {
    mockCadastrar.mockResolvedValue({ error: 'RLS negou' })
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} cidades={cidades} onSaved={jest.fn()} onClose={jest.fn()} />)

    await user.type(screen.getByLabelText(/nome/i), 'Maria')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Não foi possível cadastrar o lead. Tente novamente.')).toBeInTheDocument()
  })

  it('chama onClose ao clicar em Cancelar', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<ModalCadastrarLead conversaId="c1" telefone="5511999998888" nomeSugerido={null} cidades={cidades} onSaved={jest.fn()} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
