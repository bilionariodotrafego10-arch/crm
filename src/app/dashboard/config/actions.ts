'use server'

import { randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function convidarUsuario(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user: usuarioLogado } } = await supabase.auth.getUser()
  if (usuarioLogado?.app_metadata?.role !== 'admin') {
    return { error: 'Não autorizado' }
  }

  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const roleValidado = role === 'admin' ? 'admin' : 'vendedor'
  const admin = createAdminClient()

  // inviteUserByEmail só aceita `data` (grava em user_metadata) e `redirectTo`.
  // Não existe opção para gravar app_metadata diretamente no convite, então o
  // role precisa ser gravado em uma segunda chamada via updateUserById, que é
  // o campo lido por middleware.ts / dashboard/layout.tsx / config/page.tsx
  // para decisões de autorização.
  //
  // redirectTo aponta para /aceitar-convite (não /login): o link do convite
  // chega com os tokens de sessão no fragmento da URL (#access_token=...),
  // que o servidor nunca recebe. /aceitar-convite é client-side e processa
  // esse fragmento (createClient() com detectSessionInUrl) antes de deixar a
  // pessoa definir a senha — sem isso ela cai numa tela de login sem ter
  // senha nenhuma, travada.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/aceitar-convite`,
  })

  if (error) return { error: error.message }

  const userId = data.user?.id
  if (!userId) {
    return { error: 'Usuário convidado, mas não foi possível definir o cargo. Contate o suporte.' }
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: roleValidado },
  })
  if (updateError) return { error: updateError.message }

  return { error: null }
}

export async function removerUsuario(userId: string) {
  const supabase = await createServerClient()
  const { data: { user: usuarioLogado } } = await supabase.auth.getUser()
  if (usuarioLogado?.app_metadata?.role !== 'admin') {
    return { error: 'Não autorizado' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  return { error: null }
}

export async function trocarSenha(formData: FormData) {
  const novaSenha = formData.get('novaSenha') as string
  const supabase = await createServerClient()
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) return { error: error.message }
  return { error: null }
}

export async function listarUsuarios() {
  const supabase = await createServerClient()
  const { data: { user: usuarioLogado } } = await supabase.auth.getUser()
  if (usuarioLogado?.app_metadata?.role !== 'admin') {
    return []
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return []
  return data.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    role: (u.app_metadata?.role as string) ?? 'vendedor',
  }))
}

export async function criarInstanciaWhatsapp(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user: usuarioLogado } } = await supabase.auth.getUser()
  if (usuarioLogado?.app_metadata?.role !== 'admin') {
    return { error: 'Não autorizado', webhookUrl: null }
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return { error: 'NEXT_PUBLIC_APP_URL não configurada no ambiente', webhookUrl: null }
  }

  const apelido = formData.get('apelido') as string
  const telefone = formData.get('telefone') as string
  const instanceId = formData.get('instanceId') as string
  const token = formData.get('token') as string
  const clientToken = formData.get('clientToken') as string
  const webhookSecret = randomUUID()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('whatsapp_instancias')
    .insert({
      apelido,
      telefone,
      instance_id: instanceId,
      token,
      client_token: clientToken,
      webhook_secret: webhookSecret,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, webhookUrl: null }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/zapi/${data.id}?secret=${webhookSecret}`
  return { error: null, webhookUrl }
}

export async function removerInstanciaWhatsapp(id: string) {
  const supabase = await createServerClient()
  const { data: { user: usuarioLogado } } = await supabase.auth.getUser()
  if (usuarioLogado?.app_metadata?.role !== 'admin') {
    return { error: 'Não autorizado' }
  }

  const admin = createAdminClient()
  // Desativação (soft delete), não remoção física: a FK de whatsapp_conversas
  // é ON DELETE SET NULL, então um delete físico deixaria conversas com
  // instancia_id null (impossíveis de reativar) e, como UNIQUE trata NULLs
  // como distintos, reconectar o mesmo número duplicaria threads de contatos
  // já existentes. A coluna `ativo` existe justamente para isso — o webhook
  // já checa `instancia.ativo` antes de aceitar mensagens.
  const { error } = await admin.from('whatsapp_instancias').update({ ativo: false }).eq('id', id)
  if (error) return { error: error.message }
  return { error: null }
}
