'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trocarSenha } from '@/app/dashboard/config/actions'

type Estado = 'carregando' | 'pronto' | 'invalido'

export default function AceitarConvitePage() {
  const [estado, setEstado] = useState<Estado>('carregando')
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Links de convite/confirmação chegam com a sessão no fragmento da URL
    // (#access_token=...&refresh_token=...) porque o GoTrue usa o fluxo
    // implícito por padrão. O cliente @supabase/ssr não faz auto-detecção de
    // hash (ele foi desenhado para o fluxo PKCE via ?code=), então extraímos
    // os tokens manualmente e chamamos setSession() — isso também persiste a
    // sessão em cookie, deixando o servidor autenticado nas próximas rotas.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')

    const resultado =
      accessToken && refreshToken
        ? supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        : supabase.auth.getSession()

    resultado
      .then(({ data }: { data: { session: unknown } }) => {
        if (data.session) {
          // Limpa os tokens da URL/histórico agora que a sessão já foi
          // estabelecida via cookie — não precisam mais ficar visíveis.
          window.history.replaceState(null, '', window.location.pathname)
          setEstado('pronto')
        } else {
          setEstado('invalido')
        }
      })
      .catch(() => setEstado('invalido'))
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)

    const formData = new FormData(e.currentTarget)
    const novaSenha = formData.get('novaSenha') as string
    const confirmarSenha = formData.get('confirmarSenha') as string

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    const { error } = await trocarSenha(formData)
    if (error) {
      setErro('Não foi possível definir a senha. Tente novamente.')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 rounded-xl border border-border bg-card shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao CRM Tráfego</h1>
          <p className="text-sm text-muted-foreground">Defina sua senha para ativar sua conta</p>
        </div>

        {estado === 'carregando' && (
          <p className="text-sm text-muted-foreground">Verificando convite...</p>
        )}

        {estado === 'invalido' && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              Link inválido ou expirado. Peça um novo convite ao administrador.
            </p>
          </div>
        )}

        {estado === 'pronto' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {erro && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{erro}</p>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="novaSenha" className="text-sm font-medium text-foreground">
                Nova senha
              </label>
              <input
                id="novaSenha"
                name="novaSenha"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmarSenha" className="text-sm font-medium text-foreground">
                Confirmar senha
              </label>
              <input
                id="confirmarSenha"
                name="confirmarSenha"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Definir senha
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
