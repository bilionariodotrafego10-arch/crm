import { validarAssinaturaWebhook, extrairMensagemRecebida } from '@/lib/zapi/webhook'

describe('validarAssinaturaWebhook', () => {
  it('retorna true quando o segredo bate', () => {
    expect(validarAssinaturaWebhook('abc123', 'abc123')).toBe(true)
  })

  it('retorna false quando o segredo não bate', () => {
    expect(validarAssinaturaWebhook('abc123', 'outroSegredo')).toBe(false)
  })

  it('retorna false quando não veio segredo nenhum', () => {
    expect(validarAssinaturaWebhook(null, 'abc123')).toBe(false)
  })
})

describe('extrairMensagemRecebida', () => {
  it('extrai mensagem de texto', () => {
    const payload = {
      type: 'ReceivedCallback',
      fromMe: false,
      phone: '5544999999999',
      momment: 1632228638000,
      senderName: 'Maria',
      messageId: 'msg-1',
      text: { message: 'Oi, quero saber mais sobre o curso' },
    }
    expect(extrairMensagemRecebida(payload)).toEqual({
      telefone: '5544999999999',
      nomeContato: 'Maria',
      tipo: 'texto',
      conteudoTexto: 'Oi, quero saber mais sobre o curso',
      midiaUrl: null,
      momento: new Date(1632228638000),
      messageId: 'msg-1',
    })
  })

  it('extrai mensagem de imagem com legenda', () => {
    const payload = {
      type: 'ReceivedCallback',
      fromMe: false,
      phone: '5544999999999',
      momment: 1632228828000,
      senderName: 'Maria',
      messageId: 'msg-2',
      image: { imageUrl: 'https://z-api.example/img.jpg', caption: 'Print do erro' },
    }
    expect(extrairMensagemRecebida(payload)).toEqual({
      telefone: '5544999999999',
      nomeContato: 'Maria',
      tipo: 'imagem',
      conteudoTexto: 'Print do erro',
      midiaUrl: 'https://z-api.example/img.jpg',
      momento: new Date(1632228828000),
      messageId: 'msg-2',
    })
  })

  it('extrai mensagem de áudio', () => {
    const payload = {
      type: 'ReceivedCallback',
      fromMe: false,
      phone: '5544999999999',
      momment: 1632228849000,
      senderName: null,
      audio: { audioUrl: 'https://z-api.example/audio.ogg' },
    }
    expect(extrairMensagemRecebida(payload)).toEqual({
      telefone: '5544999999999',
      nomeContato: null,
      tipo: 'audio',
      conteudoTexto: null,
      midiaUrl: 'https://z-api.example/audio.ogg',
      momento: new Date(1632228849000),
      messageId: null,
    })
  })

  it('ignora mensagens de grupo (isGroup true)', () => {
    const payload = {
      type: 'ReceivedCallback',
      fromMe: false,
      isGroup: true,
      phone: '5544999999999',
      momment: 1632228638000,
      text: { message: 'Oi pessoal' },
    }
    expect(extrairMensagemRecebida(payload)).toBeNull()
  })

  it('ignora mensagens enviadas por mim mesmo (fromMe true)', () => {
    const payload = {
      type: 'ReceivedCallback',
      fromMe: true,
      phone: '5544999999999',
      momment: 1632228638000,
      text: { message: 'Oi' },
    }
    expect(extrairMensagemRecebida(payload)).toBeNull()
  })

  it('ignora eventos que não são de mensagem recebida', () => {
    const payload = { type: 'MessageStatusCallback', phone: '5544999999999' }
    expect(extrairMensagemRecebida(payload)).toBeNull()
  })

  it('ignora payload malformado sem phone', () => {
    const payload = { type: 'ReceivedCallback', fromMe: false, momment: 123, text: { message: 'oi' } }
    expect(extrairMensagemRecebida(payload)).toBeNull()
  })
})
