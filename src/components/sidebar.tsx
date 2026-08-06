'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'

interface SidebarProps {
  role: string
}

const navItems = [
  { href: '/dashboard/whatsapp', label: 'WhatsApp' },
  { href: '/dashboard/follow-up', label: 'Follow-up' },
  { href: '/dashboard/cidades', label: 'Cidades' },
  { href: '/dashboard/alunos', label: 'Alunos' },
]

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const items = role === 'admin'
    ? [...navItems, { href: '/dashboard/config', label: 'Configurações' }]
    : navItems

  return (
    <aside className="w-56 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-bold text-foreground">CRM Tráfego</h2>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-border">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
