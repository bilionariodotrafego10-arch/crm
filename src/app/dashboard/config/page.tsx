import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function ConfigPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role as string | undefined
  if (role !== 'admin') {
    redirect('/dashboard/follow-up')
  }

  return <div><h1 className="text-2xl font-bold text-foreground">Configurações</h1></div>
}
