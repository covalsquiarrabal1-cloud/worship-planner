'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, Home, Crown, Mic, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface DashboardData {
  ministries: number
  members: number
  leaders: number
  ministers: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // silently fail
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const cards = [
    {
      label: 'Ministérios',
      value: data?.ministries ?? 0,
      icon: <Home className="w-7 h-7" />,
      href: '/admin/ministerios',
      color: 'from-[#238636] to-[#2ea043]',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
    },
    {
      label: 'Líderes',
      value: data?.leaders ?? 0,
      icon: <Crown className="w-7 h-7" />,
      href: '/admin/membros',
      color: 'from-[#9333ea] to-[#a855f7]',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    },
    {
      label: 'Membros',
      value: data?.members ?? 0,
      icon: <Users className="w-7 h-7" />,
      href: '/admin/membros',
      color: 'from-[#1d4ed8] to-[#3b82f6]',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Ministros',
      value: data?.ministers ?? 0,
      icon: <Mic className="w-7 h-7" />,
      href: '/admin/membros',
      color: 'from-[#b45309] to-[#f59e0b]',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
    },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card relative overflow-hidden group hover:border-[var(--border)] transition-all active:scale-95"
          >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />

            <div className="flex flex-col items-center text-center pt-4 pb-2 gap-3">
              <div className={`p-3 rounded-xl ${card.iconBg} ${card.iconColor}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{card.label}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--muted-foreground)] group-hover:text-[#58a6ff] transition-colors mt-1 pb-1">
              <span>Ver detalhes</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
