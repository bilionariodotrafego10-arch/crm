import { render, screen } from '@testing-library/react'
import { BotaoExportarCSV } from '@/components/botao-exportar-csv'

describe('BotaoExportarCSV', () => {
  it('renderiza botão com texto correto', () => {
    render(<BotaoExportarCSV dados={[]} colunas={['nome']} nomeArquivo="test.csv" />)
    expect(screen.getByText('Exportar CSV')).toBeInTheDocument()
  })

  it('botão está desabilitado quando não há dados', () => {
    render(<BotaoExportarCSV dados={[]} colunas={['nome']} nomeArquivo="test.csv" />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('botão está habilitado quando há dados', () => {
    render(
      <BotaoExportarCSV
        dados={[{ nome: 'João' }]}
        colunas={['nome']}
        nomeArquivo="test.csv"
      />
    )
    expect(screen.getByRole('button')).not.toBeDisabled()
  })
})
