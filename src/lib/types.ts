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
  criado_por: string | null
  criado_em: string
}

export interface FollowUp {
  id: string
  lead_id: string
  data: string
  observacao: string
  usuario_id: string | null
}
