export interface Cidade {
  id: string
  nome: string
  estado: string
}

export interface Lead {
  id: string
  nome: string
  telefone: string
  email: string | null
  data_contato: string
  status: 'respondeu' | 'nao_respondeu'
  status_venda: 'negociando' | 'pago'
  cidade_id: string | null
  criado_por: string | null
  criado_em: string
  cidade?: Cidade
}

export interface Aluno {
  id: string
  nome: string
  telefone: string
  email: string
  data_matricula: string
  curso: string
  cidade_id: string | null
  criado_por: string | null
  criado_em: string
  cidade?: Cidade
}

export interface FollowUp {
  id: string
  lead_id: string
  data: string
  observacao: string
  usuario_id: string | null
}

export interface WhatsappInstancia {
  id: string
  apelido: string
  telefone: string
  ativo: boolean
}

export interface WhatsappConversa {
  id: string
  instancia_id: string | null
  telefone_contato: string
  chat_lid: string | null
  nome_contato: string | null
  lead_id: string | null
  ultima_mensagem_em: string
  criado_em: string
  instancia?: WhatsappInstancia
  lead?: Pick<Lead, 'id' | 'nome'>
}

export interface WhatsappMensagem {
  id: string
  conversa_id: string
  direcao: 'recebida' | 'enviada'
  tipo: 'texto' | 'imagem' | 'audio' | 'video' | 'documento'
  conteudo_texto: string | null
  midia_url: string | null
  enviado_por: string | null
  status_envio: 'enviando' | 'enviado' | 'falhou'
  criado_em: string
}
