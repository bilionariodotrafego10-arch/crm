import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormularioInstancia } from '@/components/whatsapp/formulario-instancia'

const mockCriar = jest.fn()
const mockRemover = jest.fn()
jest.mock('@/app/dashboard/config/actions', () => ({
  criarInstanciaWhatsapp: (formData: FormData) => mockCriar(formData),
  removerInstanciaWhatsapp: (id: string) => mockRemover(id),
}))

describe('FormularioInstancia', () => {
  beforeEach(() => {
    mockCriar.mockReset()
    mockRemover.mockReset()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renderiza os campos obrigatórios', () => {
    render(<FormularioInstancia instancias={[]} onChange={jest.fn()} />)
    expect(screen.getByPlaceholderText(/apelido/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/telefone/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/instance id/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/token da instância/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/client-token/i)).toBeInTheDocument()
  })

  it('lista as instâncias existentes com apelido e status', () => {
    render(
      <FormularioInstancia
        instancias={[{ id: '1', apelido: 'WhatsApp Nathan', telefone: '5511999999999', ativo: true }]}
        onChange={jest.fn()}
      />
    )
    expect(screen.getByText('WhatsApp Nathan')).toBeInTheDocument()
    expect(screen.getByText(/5511999999999.*ativo/)).toBeInTheDocument()
  })

  it('ao criar com sucesso, mostra a URL do webhook e chama onChange', async () => {
    mockCriar.mockResolvedValue({ error: null, webhookUrl: 'https://exemplo.com/api/webhooks/zapi/123?secret=abc' })
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<FormularioInstancia instancias={[]} onChange={onChange} />)

    await user.type(screen.getByPlaceholderText(/apelido/i), 'WhatsApp Nathan')
    await user.type(screen.getByPlaceholderText(/telefone/i), '5511999999999')
    await user.type(screen.getByPlaceholderText(/instance id/i), 'inst123')
    await user.type(screen.getByPlaceholderText(/token da instância/i), 'tok123')
    await user.type(screen.getByPlaceholderText(/client-token/i), 'ct123')
    await user.click(screen.getByRole('button', { name: /adicionar número/i }))

    expect(mockCriar).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('https://exemplo.com/api/webhooks/zapi/123?secret=abc')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('ao remover, pede confirmação e chama removerInstanciaWhatsapp', async () => {
    mockRemover.mockResolvedValue({ error: null })
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(
      <FormularioInstancia
        instancias={[{ id: '1', apelido: 'WhatsApp Nathan', telefone: '5511999999999', ativo: true }]}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /remover/i }))

    expect(mockRemover).toHaveBeenCalledWith('1')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
