'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string
  const confirmarSenha = formData.get('confirmarSenha') as string

  if (senha !== confirmarSenha) {
    redirect('/signup?error=senha_diferente')
  }

  if (senha.length < 6) {
    redirect('/signup?error=senha_curta')
  }

  const supabase = await createServerClient()
  const { error: signUpError } = await supabase.auth.signUp({ email, password: senha })

  if (signUpError) {
    redirect('/signup?error=1')
  }

  // signUp() não retorna sessão quando a instância ainda exige confirmação de
  // email (o cadastro é confirmado automaticamente no banco via trigger, mas
  // o GoTrue decide se devolve sessão com base na config, não no estado da
  // linha). Autenticar explicitamente garante a sessão nos dois cenários.
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (signInError) {
    redirect('/signup?error=1')
  }

  redirect('/dashboard')
}
