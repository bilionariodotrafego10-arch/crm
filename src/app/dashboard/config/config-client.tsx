'use client'

import { useState } from 'react'
import { useCidades } from '@/hooks/use-cidades'
import { convidarUsuario, removerUsuario, trocarSenha } from './actions'

interface Usuario {
  id: string
  email: string
  role: string
}

export function ConfigClient({ usuariosIniciais }: { usuariosIniciais: Usuario[] }) {
  const { cidades, createCidade, deleteCidade } = useCidades()
  const [usuarios] = useState<Usuario[]>(usuariosIniciais)
  const [mensagem, setMensagem] = useState('')
  const [novaCidade, setNovaCidade] = useState({ nome: '', estado: '' })

  const handleConvidar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const { error } = await convidarUsuario(form)
    setMensagem(error ? `Erro: ${error}` : 'Convite enviado! O usuário receberá um email.')
    if (!error) (e.target as HTMLFormElement).reset()
  }

  const handleTrocarSenha = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const { error } = await trocarSenha(form)
    setMensagem(error ? `Erro: ${error}` : 'Senha alterada com sucesso!')
    if (!error) (e.target as HTMLFormElement).reset()
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      {mensagem && (
        <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
          <p className="text-sm text-foreground">{mensagem}</p>
        </div>
      )}

      {/* Convidar usuário */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Convidar Usuário</h2>
        <form onSubmit={handleConvidar} className="flex gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="email@exemplo.com"
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            name="role"
            className="px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="vendedor">Vendedor</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Convidar
          </button>
        </form>
      </section>

      {/* Lista de usuários */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Usuários</h2>
        <div className="rounded-lg border border-border divide-y divide-border">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{u.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
              </div>
              <button
                onClick={async () => {
                  if (confirm('Remover este usuário?')) await removerUsuario(u.id)
                }}
                className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Gerenciar cidades */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Cidades</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await createCidade(novaCidade)
            setNovaCidade({ nome: '', estado: '' })
          }}
          className="flex gap-2"
        >
          <input
            required
            placeholder="Nome da cidade"
            value={novaCidade.nome}
            onChange={(e) => setNovaCidade({ ...novaCidade, nome: e.target.value })}
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            required
            placeholder="UF"
            maxLength={2}
            value={novaCidade.estado}
            onChange={(e) => setNovaCidade({ ...novaCidade, estado: e.target.value.toUpperCase() })}
            className="w-16 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Adicionar
          </button>
        </form>

        <div className="rounded-lg border border-border divide-y divide-border">
          {cidades.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">{c.nome} — {c.estado}</span>
              <button
                onClick={() => deleteCidade(c.id)}
                className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Trocar senha */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Trocar Senha</h2>
        <form onSubmit={handleTrocarSenha} className="flex gap-2">
          <input
            name="novaSenha"
            type="password"
            required
            minLength={6}
            placeholder="Nova senha (mín. 6 caracteres)"
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Alterar
          </button>
        </form>
      </section>
    </div>
  )
}
