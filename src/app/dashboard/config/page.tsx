import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { listarUsuarios } from './actions'
import { ConfigClient } from './config-client'

export default async function ConfigPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role as string | undefined
  if (role !== 'admin') {
    redirect('/dashboard/follow-up')
  }

  const usuarios = await listarUsuarios()
  return <ConfigClient usuariosIniciais={usuarios} />
}
