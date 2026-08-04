'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function convidarUsuario(formData: FormData) {
  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const admin = getAdminClient()

  // inviteUserByEmail só aceita `data` (grava em user_metadata) e `redirectTo`.
  // Não existe opção para gravar app_metadata diretamente no convite, então o
  // role precisa ser gravado em uma segunda chamada via updateUserById, que é
  // o campo lido por middleware.ts / dashboard/layout.tsx / config/page.tsx
  // para decisões de autorização.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
  })

  if (error) return { error: error.message }

  const userId = data.user?.id
  if (userId) {
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    })
    if (updateError) return { error: updateError.message }
  }

  return { error: null }
}

export async function removerUsuario(userId: string) {
  const admin = getAdminClient()
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
  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return []
  return data.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    role: (u.app_metadata?.role as string) ?? 'vendedor',
  }))
}
