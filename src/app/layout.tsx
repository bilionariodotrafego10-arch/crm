import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { RedirecionarSeConvite } from '@/components/redirecionar-se-convite'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CRM Tráfego',
  description: 'Sistema de gestão de leads e alunos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        <RedirecionarSeConvite />
        {children}
      </body>
    </html>
  )
}
