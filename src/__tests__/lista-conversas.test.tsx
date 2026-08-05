import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListaConversas } from '@/components/whatsapp/lista-conversas'
import type { WhatsappConversa, WhatsappInstancia } from '@/lib/types'

const instancias: WhatsappInstancia[] = [
  { id: 'i1', apelido: 'WhatsApp Nathan', telefone: '5511111111111', ativo: true },
  { id: 'i2', apelido: 'WhatsApp Sócio', telefone: '5511222222222', ativo: true },
]

const conversas: WhatsappConversa[] = [
  {
    id: 'c1', instancia_id: 'i1', telefone_contato: '5511999998888', nome_contato: 'Maria',
    lead_id: null, ultima_mensagem_em: '2026-08-04T10:00:00Z', criado_em: '2026-08-04T09:00:00Z',
    instancia: instancias[0],
  },
  {
    id: 'c2', instancia_id: 'i2', telefone_contato: '5511999997777', nome_contato: null,
    lead_id: 'l1', ultima_mensagem_em: '2026-08-04T11:00:00Z', criado_em: '2026-08-04T09:30:00Z',
    instancia: instancias[1], lead: { id: 'l1', nome: 'João Silva' },
  },
]

describe('ListaConversas', () => {
  it('lista as conversas, priorizando nome do lead, depois nome do contato, depois telefone', () => {
    render(
      <ListaConversas conversas={conversas} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="todos" onSelecionar={jest.fn()} onFiltroChange={jest.fn()} />
    )
    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
  })

  it('mostra a etiqueta do número em cada conversa', () => {
    render(
      <ListaConversas conversas={conversas} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="todos" onSelecionar={jest.fn()} onFiltroChange={jest.fn()} />
    )
    const linhaMaria = screen.getByText('Maria').closest('button')!
    const linhaJoao = screen.getByText('João Silva').closest('button')!
    expect(within(linhaMaria).getByText('WhatsApp Nathan')).toBeInTheDocument()
    expect(within(linhaJoao).getByText('WhatsApp Sócio')).toBeInTheDocument()
  })

  it('filtra por instância quando filtroInstanciaId não é "todos"', () => {
    render(
      <ListaConversas conversas={conversas} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="i1" onSelecionar={jest.fn()} onFiltroChange={jest.fn()} />
    )
    expect(screen.getByText('Maria')).toBeInTheDocument()
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
  })

  it('chama onSelecionar com o id ao clicar numa conversa', async () => {
    const onSelecionar = jest.fn()
    const user = userEvent.setup()
    render(
      <ListaConversas conversas={conversas} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="todos" onSelecionar={onSelecionar} onFiltroChange={jest.fn()} />
    )
    await user.click(screen.getByText('Maria'))
    expect(onSelecionar).toHaveBeenCalledWith('c1')
  })

  it('mostra estado vazio quando não há conversas', () => {
    render(
      <ListaConversas conversas={[]} instancias={instancias} conversaSelecionadaId={null} filtroInstanciaId="todos" onSelecionar={jest.fn()} onFiltroChange={jest.fn()} />
    )
    expect(screen.getByText('Nenhuma conversa ainda')).toBeInTheDocument()
  })

  it('não lista instâncias inativas no dropdown de filtro', () => {
    const instanciasComInativa: WhatsappInstancia[] = [
      ...instancias,
      { id: 'i3', apelido: 'WhatsApp Antigo', telefone: '5511333333333', ativo: false },
    ]
    render(
      <ListaConversas conversas={conversas} instancias={instanciasComInativa} conversaSelecionadaId={null} filtroInstanciaId="todos" onSelecionar={jest.fn()} onFiltroChange={jest.fn()} />
    )
    const select = screen.getByRole('combobox')
    expect(within(select).getByText('WhatsApp Nathan')).toBeInTheDocument()
    expect(within(select).queryByText('WhatsApp Antigo')).not.toBeInTheDocument()
  })
})
