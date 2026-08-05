'use server'

import { randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarTexto, enviarImagem, enviarAudio, type CredenciaisInstancia } from '@/lib/zapi/cliente'

async function buscarInfoEnvio(conversaId: string): Promise<{ telefone: string; credenciais: CredenciaisInstancia } | null> {
  const admin = createAdminClient()
  const { data: conversa } = await admin
    .from('whatsapp_conversas')
    .select('telefone_contato, instancia_id')
    .eq('id', conversaId)
    .single()
  if (!conversa?.instancia_id) return null

  const { data: instancia } = await admin
    .from('whatsapp_instancias')
    .select('instance_id, token, client_token, ativo')
    .eq('id', conversa.instancia_id)
    .single()
  if (!instancia || !instancia.ativo) return null

  return { telefone: conversa.telefone_contato, credenciais: instancia }
}

export async function enviarMensagemTexto(formData: FormData) {
  const conversaId = formData.get('conversaId') as string
  const texto = formData.get('texto') as string

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const info = await buscarInfoEnvio(conversaId)
  if (!info) return { error: 'Conversa sem número de WhatsApp ativo' }

  const { data: mensagem, error: erroInsercao } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      conversa_id: conversaId,
      direcao: 'enviada',
      tipo: 'texto',
      conteudo_texto: texto,
      enviado_por: user.id,
      status_envio: 'enviando',
    })
    .select('id')
    .single()
  if (erroInsercao || !mensagem) return { error: 'Não foi possível registrar a mensagem' }

  const resultado = await enviarTexto(info.credenciais, info.telefone, texto)

  await supabase
    .from('whatsapp_mensagens')
    .update({ status_envio: resultado.ok ? 'enviado' : 'falhou' })
    .eq('id', mensagem.id)

  await supabase.from('whatsapp_conversas').update({ ultima_mensagem_em: new Date().toISOString() }).eq('id', conversaId)

  return resultado.ok ? { error: null } : { error: resultado.erro }
}

export async function enviarMensagemMidia(formData: FormData) {
  const conversaId = formData.get('conversaId') as string
  const tipo = formData.get('tipo') as 'imagem' | 'audio'
  const arquivo = formData.get('arquivo') as File

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const info = await buscarInfoEnvio(conversaId)
  if (!info) return { error: 'Conversa sem número de WhatsApp ativo' }

  const extensao = tipo === 'imagem' ? 'jpg' : 'ogg'
  const caminho = `${tipo}/${randomUUID()}.${extensao}`
  const { error: erroUpload } = await supabase.storage
    .from('whatsapp-midia')
    .upload(caminho, arquivo, { contentType: arquivo.type })
  if (erroUpload) return { error: erroUpload.message }

  const { data: urlAssinada } = await supabase.storage.from('whatsapp-midia').createSignedUrl(caminho, 3600)
  if (!urlAssinada) return { error: 'Não foi possível gerar URL da mídia' }

  const { data: mensagem, error: erroInsercao } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      conversa_id: conversaId,
      direcao: 'enviada',
      tipo,
      midia_url: caminho,
      enviado_por: user.id,
      status_envio: 'enviando',
    })
    .select('id')
    .single()
  if (erroInsercao || !mensagem) return { error: 'Não foi possível registrar a mensagem' }

  const resultado = tipo === 'imagem'
    ? await enviarImagem(info.credenciais, info.telefone, urlAssinada.signedUrl)
    : await enviarAudio(info.credenciais, info.telefone, urlAssinada.signedUrl)

  await supabase
    .from('whatsapp_mensagens')
    .update({ status_envio: resultado.ok ? 'enviado' : 'falhou' })
    .eq('id', mensagem.id)

  await supabase.from('whatsapp_conversas').update({ ultima_mensagem_em: new Date().toISOString() }).eq('id', conversaId)

  return resultado.ok ? { error: null } : { error: resultado.erro }
}

export async function cadastrarLeadDaConversa(conversaId: string, dados: { nome: string; email: string | null }) {
  const supabase = await createServerClient()
  const { data: conversa } = await supabase
    .from('whatsapp_conversas')
    .select('telefone_contato')
    .eq('id', conversaId)
    .single()
  if (!conversa) return { error: 'Conversa não encontrada' }

  const { data: lead, error: erroLead } = await supabase
    .from('leads')
    .insert({
      nome: dados.nome,
      telefone: conversa.telefone_contato,
      email: dados.email,
      data_contato: new Date().toISOString().slice(0, 10),
      status: 'respondeu',
    })
    .select('id')
    .single()
  if (erroLead) return { error: erroLead.message }

  const { error: erroConversa } = await supabase
    .from('whatsapp_conversas')
    .update({ lead_id: lead.id })
    .eq('id', conversaId)
  if (erroConversa) return { error: erroConversa.message }

  return { error: null }
}
