import Link from 'next/link'
import { signUp } from './actions'

// Map em vez de objeto: uma chave como "constructor" ou "toString" em
// ?error= não deve acidentalmente resolver para algo do Object.prototype.
const MENSAGENS_ERRO = new Map([
  ['senha_diferente', 'As senhas não coincidem.'],
  ['senha_curta', 'A senha deve ter pelo menos 6 caracteres.'],
])
const MENSAGEM_ERRO_PADRAO = 'Não foi possível criar a conta. Tente novamente.'

interface Props {
  searchParams?: { error?: string }
}

export default function SignupPage({ searchParams }: Props) {
  const mensagemErro = searchParams?.error
    ? MENSAGENS_ERRO.get(searchParams.error) ?? MENSAGEM_ERRO_PADRAO
    : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8 rounded-xl border border-border bg-card shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
          <p className="text-sm text-muted-foreground">Cadastre-se para acessar o CRM Tráfego</p>
        </div>

        {mensagemErro && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{mensagemErro}</p>
          </div>
        )}

        <form action={signUp} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="senha" className="text-sm font-medium text-foreground">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
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
            Cadastrar
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
