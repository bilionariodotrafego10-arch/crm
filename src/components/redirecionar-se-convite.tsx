'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Montado no layout raiz (roda em toda página, autenticada ou não): alguns
// links de convite/confirmação caem com a sessão no fragmento da URL
// (#access_token=...) em vez de /aceitar-convite — seja porque a config de
// Redirect URLs do Supabase ainda não inclui o destino certo, seja porque o
// e-mail usou o link padrão. O fragmento sobrevive a redirects do Next.js
// (inclusive quando o navegador já tem outra sessão ativa e cai direto em
// /dashboard em vez de /login), então precisa ser capturado em toda página,
// não só na tela de login.
export function RedirecionarSeConvite() {
  const router = useRouter()

  useEffect(() => {
    if (window.location.hash.includes('access_token=')) {
      router.replace(`/aceitar-convite${window.location.hash}`)
    }
  }, [router])

  return null
}
