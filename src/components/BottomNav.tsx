'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, Music, Settings, User } from 'lucide-react'

interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
}

export function AdminBottomNav() {
  const pathname = usePathname()

  const items: NavItem[] = [
    { href: '/admin', icon: <Calendar className="w-5 h-5" />, label: 'Escalas' },
    { href: '/admin/membros', icon: <Users className="w-5 h-5" />, label: 'Membros' },
    { href: '/admin/musicas', icon: <Music className="w-5 h-5" />, label: 'Músicas' },
    { href: '/admin/config', icon: <Settings className="w-5 h-5" />, label: 'Config' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] z-50">
      <div className="flex items-center justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'text-[var(--muted-foreground)]'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MemberBottomNav() {
  const pathname = usePathname()

  const items: NavItem[] = [
    { href: '/membro', icon: <Calendar className="w-5 h-5" />, label: 'Escala' },
    { href: '/membro/meus-dias', icon: <User className="w-5 h-5" />, label: 'Meus Dias' },
    { href: '/membro/musicas', icon: <Music className="w-5 h-5" />, label: 'Músicas' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] z-50">
      <div className="flex items-center justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'text-[var(--muted-foreground)]'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
