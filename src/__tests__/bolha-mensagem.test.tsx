import { render, screen } from '@testing-library/react'
import { BolhaMensagem } from '@/components/whatsapp/bolha-mensagem'
import type { WhatsappMensagem } from '@/lib/types'

const base: WhatsappMensagem = {
  id: '1',
  conversa_id: 'c1',
  direcao: 'recebida',
  tipo: 'texto',
  conteudo_texto: null,
  midia_url: null,
  enviado_por: null,
  status_envio: 'enviado',
  criado_em: '2026-08-04T10:00:00Z',
}

describe('BolhaMensagem', () => {
  it('renderiza mensagem de texto', () => {
    render(<BolhaMensagem mensagem={{ ...base, tipo: 'texto', conteudo_texto: 'Olá, tudo bem?' }} />)
    expect(screen.getByText('Olá, tudo bem?')).toBeInTheDocument()
  })

  it('renderiza mensagem de imagem', () => {
    render(<BolhaMensagem mensagem={{ ...base, tipo: 'imagem', midia_url: 'https://exemplo.com/foto.jpg' }} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://exemplo.com/foto.jpg')
  })

  it('renderiza mensagem de áudio', () => {
    const { container } = render(<BolhaMensagem mensagem={{ ...base, tipo: 'audio', midia_url: 'https://exemplo.com/audio.ogg' }} />)
    const audio = container.querySelector('audio')
    expect(audio).toHaveAttribute('src', 'https://exemplo.com/audio.ogg')
  })

  it('renderiza mensagem de vídeo', () => {
    const { container } = render(<BolhaMensagem mensagem={{ ...base, tipo: 'video', midia_url: 'https://exemplo.com/video.mp4' }} />)
    const video = container.querySelector('video')
    expect(video).toHaveAttribute('src', 'https://exemplo.com/video.mp4')
  })

  it('renderiza mensagem de documento como link com o nome do arquivo', () => {
    render(<BolhaMensagem mensagem={{ ...base, tipo: 'documento', midia_url: 'https://exemplo.com/contrato.pdf', conteudo_texto: 'contrato.pdf' }} />)
    const link = screen.getByRole('link', { name: /contrato\.pdf/i })
    expect(link).toHaveAttribute('href', 'https://exemplo.com/contrato.pdf')
  })

  it('mostra "Enviando..." só para mensagens enviadas por mim com status enviando', () => {
    render(<BolhaMensagem mensagem={{ ...base, direcao: 'enviada', tipo: 'texto', conteudo_texto: 'oi', status_envio: 'enviando' }} />)
    expect(screen.getByText('Enviando...')).toBeInTheDocument()
  })

  it('mostra aviso de falha para mensagens enviadas por mim com status falhou', () => {
    render(<BolhaMensagem mensagem={{ ...base, direcao: 'enviada', tipo: 'texto', conteudo_texto: 'oi', status_envio: 'falhou' }} />)
    expect(screen.getByText('Falha ao enviar')).toBeInTheDocument()
  })

  it('não mostra status de envio para mensagens recebidas', () => {
    render(<BolhaMensagem mensagem={{ ...base, direcao: 'recebida', tipo: 'texto', conteudo_texto: 'oi', status_envio: 'enviando' }} />)
    expect(screen.queryByText('Enviando...')).not.toBeInTheDocument()
  })

  it('renderiza a legenda de uma imagem junto com a mídia', () => {
    render(<BolhaMensagem mensagem={{ ...base, tipo: 'imagem', midia_url: 'https://exemplo.com/foto.jpg', conteudo_texto: 'Print do erro' }} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.getByText('Print do erro')).toBeInTheDocument()
  })

  it('mostra aviso de mídia indisponível quando midia_url é nulo', () => {
    render(<BolhaMensagem mensagem={{ ...base, tipo: 'imagem', midia_url: null }} />)
    expect(screen.getByText('Mídia não disponível')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
