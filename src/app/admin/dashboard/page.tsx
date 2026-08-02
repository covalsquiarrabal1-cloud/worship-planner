'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, Home, Crown, ChevronRight, UserCircle } from 'lucide-react'
import Link from 'next/link'

interface RoleCount {
  id: string
  name: string
  count: number
}

interface DashboardData {
  ministries: number
  totalPeople: number
  roleCounts: RoleCount[]
}

const roleIcons: Record<string, string> = {
  'Pastor': '⛪',
  'Ministro': '🎤',
  'Membro': '👥',
  'Diácono': '🙏',
  'Presbítero': '📖',
}

const roleColors: Record<string, { gradient: string; iconBg: string; iconColor: string }> = {
  'Pastor': { gradient: 'from-[#9333ea] to-[#a855f7]', iconBg: 'bg-purple-500/20', iconColor: 'text-purple-400' },
  'Ministro': { gradient: 'from-[#b45309] to-[#f59e0b]', iconBg: 'bg-amber-500/20', iconColor: 'text-amber-400' },
  'Membro': { gradient: 'from-[#1d4ed8] to-[#3b82f6]', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400' },
}

const defaultColor = { gradient: 'from-[#0f766e] to-[#14b8a6]', iconBg: 'bg-teal-500/20', iconColor: 'text-teal-400' }

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Ministérios card */}
        <Link
          href="/admin/ministerios"
          className="card relative overflow-hidden group hover:border-[var(--border)] transition-all active:scale-95"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#238636] to-[#2ea043]" />
          <div className="flex flex-col items-center text-center pt-4 pb-2 gap-3">
            <div className="p-3 rounded-xl bg-green-500/20 text-green-400">
              <Home className="w-7 h-7" />
            </div>
            <div>
              <p className="text-3xl font-bold">{data?.ministries ?? 0}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Ministérios</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--muted-foreground)] group-hover:text-[#58a6ff] transition-colors mt-1 pb-1">
            <span>Ver detalhes</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Total pessoas */}
        <Link
          href="/admin/relatorios"
          className="card relative overflow-hidden group hover:border-[var(--border)] transition-all active:scale-95"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] to-[#818cf8]" />
          <div className="flex flex-col items-center text-center pt-4 pb-2 gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-3xl font-bold">{data?.totalPeople ?? 0}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Total Cadastrados</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--muted-foreground)] group-hover:text-[#58a6ff] transition-colors mt-1 pb-1">
            <span>Ver detalhes</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Dynamic role cards */}
        {(data?.roleCounts || []).map((role) => {
          const colors = roleColors[role.name] || defaultColor
          const icon = roleIcons[role.name] || '👤'

          return (
            <Link
              key={role.id}
              href="/admin/relatorios"
              className="card relative overflow-hidden group hover:border-[var(--border)] transition-all active:scale-95"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`} />
              <div className="flex flex-col items-center text-center pt-4 pb-2 gap-3">
                <div className={`p-3 rounded-xl ${colors.iconBg}`}>
                  <span className="text-2xl">{icon}</span>
                </div>
                <div>
                  <p className="text-3xl font-bold">{role.count}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{role.name}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--muted-foreground)] group-hover:text-[#58a6ff] transition-colors mt-1 pb-1">
                <span>Ver detalhes</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
