'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, Music, Settings, User, ListMusic, Mic, Wrench, BarChart3, Home, DoorOpen, ClipboardList } from 'lucide-react'
import { playClick } from '@/lib/sounds'

interface NavItem {
  href: string
  icon: React.ReactNode
  label: string
}

export function AdminBottomNav() {
  const pathname = usePathname()

  const items: NavItem[] = [
    { href: '/admin/dashboard', icon: <BarChart3 className="w-7 h-7" />, label: 'Dashboard' },
    { href: '/admin', icon: <Calendar className="w-7 h-7" />, label: 'Escalas' },
    { href: '/admin/membros', icon: <Users className="w-7 h-7" />, label: 'Membros' },
    { href: '/admin/musicas', icon: <Music className="w-7 h-7" />, label: 'Músicas' },
    { href: '/admin/ministerios', icon: <Home className="w-7 h-7" />, label: 'Ministérios' },
    { href: '/admin/formulario', icon: <ClipboardList className="w-7 h-7" />, label: 'Formulário' },
    { href: '/admin/relatorios', icon: <BarChart3 className="w-7 h-7" />, label: 'Relatórios' },
    { href: '/admin/config', icon: <Settings className="w-7 h-7" />, label: 'Config' },
  ]

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', overflow: 'hidden', zIndex: 50 }} className="bg-[#161b22] border-t border-[#30363d]">
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
              className={`flex flex-col items-center justify-center gap-1 min-w-[52px] min-h-[52px] px-2 py-1.5 rounded-2xl transition-all active:scale-90 active:bg-[#58a6ff]/20 ${
                isActive
                  ? 'text-[#58a6ff] bg-[#58a6ff]/15 shadow-[0_0_12px_rgba(88,166,255,0.25)]'
                  : 'text-[#8b949e]'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MemberBottomNav({ showMusicas = false }: { showMusicas?: boolean }) {
  const pathname = usePathname()

  const items: NavItem[] = [
    { href: '/membro', icon: <Calendar className="w-7 h-7" />, label: 'Escala' },
    { href: '/membro/meus-dias', icon: <User className="w-7 h-7" />, label: 'Meus Dias' },
    ...(showMusicas ? [{ href: '/membro/musicas', icon: <Music className="w-7 h-7" />, label: 'Músicas' }] : []),
  ]

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', overflow: 'hidden', zIndex: 50 }} className="bg-[#161b22] border-t border-[#30363d]">
      <div className="max-w-5xl mx-auto flex items-center justify-around py-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => playClick()}
              className={`flex flex-col items-center justify-center gap-1.5 min-w-[60px] min-h-[56px] px-4 py-2 rounded-2xl transition-all active:scale-90 active:bg-[#58a6ff]/20 ${
                isActive ? 'text-[#58a6ff] bg-[#58a6ff]/10' : 'text-[#8b949e]'
              }`}
            >
              <span className="w-7 h-7 flex items-center justify-center">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
