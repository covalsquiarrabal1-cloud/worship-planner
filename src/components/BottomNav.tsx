'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, Music, Settings, User, ListMusic } from 'lucide-react'
import { playClick } from '@/lib/sounds'

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
    { href: '/admin/setlist', icon: <ListMusic className="w-5 h-5" />, label: 'Set List' },
    { href: '/admin/config', icon: <Settings className="w-5 h-5" />, label: 'Config' },
  ]

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', overflow: 'hidden', zIndex: 50 }} className="bg-[var(--card)] border-t border-[var(--border)]">
      <div className="max-w-5xl mx-auto flex items-center justify-around py-3">
        {items.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href + '/')) ||
            (item.href === '/admin' && pathname === '/admin')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => playClick()}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'text-[var(--muted-foreground)] hover:text-white/70'
              }`}
            >
              {item.icon}
              <span className="text-[11px] font-medium">{item.label}</span>
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
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', overflow: 'hidden', zIndex: 50 }} className="bg-[var(--card)] border-t border-[var(--border)]">
      <div className="max-w-5xl mx-auto flex items-center justify-around py-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => playClick()}
              className={`flex flex-col items-center gap-1.5 px-5 py-2 rounded-lg transition-colors ${
                isActive ? 'text-white' : 'text-[var(--muted-foreground)] hover:text-white/70'
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
