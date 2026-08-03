'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, Home, Users, ChevronRight, ChevronDown, X, UserCircle, Crown } from 'lucide-react'
import { getMinistryIcon3D } from '@/lib/ministry-icons'

interface MinistryCount {
  id: string
  name: string
  slug: string
  count: number
}

interface PersonDetail {
  name: string
  email: string
  roles: string[]
  ministries: string[]
}

interface RoleCount {
  id: string
  name: string
  count: number
  people: { name: string; email: string; ministries: string[] }[]
}

interface DashboardData {
  ministryCounts: MinistryCount[]
  totalPeople: number
  allPeople: PersonDetail[]
  roleCounts: RoleCount[]
}

const roleIcons: Record<string, React.ReactNode> = {
  'Pastor': <Crown className="w-6 h-6 text-purple-400" />,
  'Ministro': <UserCircle className="w-6 h-6 text-amber-400" />,
  'Diácono': <Users className="w-6 h-6 text-teal-400" />,
  'Presbítero': <Users className="w-6 h-6 text-teal-400" />,
}

const defaultRoleIcon = <UserCircle className="w-6 h-6 text-teal-400" />

const roleColors: Record<string, { gradient: string; iconBg: string }> = {
  'Pastor': { gradient: 'from-[#9333ea] to-[#a855f7]', iconBg: 'bg-purple-500/20' },
  'Ministro': { gradient: 'from-[#b45309] to-[#f59e0b]', iconBg: 'bg-amber-500/20' },
}

const defaultRoleColor = { gradient: 'from-[#0f766e] to-[#14b8a6]', iconBg: 'bg-teal-500/20' }

type ExpandedSection = 'ministerios' | 'cadastrados' | string | null

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<ExpandedSection>(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!data) return null

  function toggle(section: ExpandedSection) {
    setExpanded(prev => prev === section ? null : section)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Dashboard</h2>

      {/* Ministérios card */}
      <div className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#238636] to-[#2ea043]" />
        <button onClick={() => toggle('ministerios')} className="w-full flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/20">
              <Home className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold">{data.ministryCounts.length}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Ministérios</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${expanded === 'ministerios' ? 'rotate-180' : ''}`} />
        </button>

        {expanded === 'ministerios' && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1.5 max-h-[400px] overflow-y-auto">
            {data.ministryCounts.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--accent)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
                    <img src={getMinistryIcon3D(m.slug)} alt={m.name} className="w-4.5 h-4.5 object-contain" />
                  </div>
                  <span className="text-sm font-medium">{m.name}</span>
                </div>
                <span className="text-sm font-bold text-[#58a6ff]">{m.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Cadastrados card */}
      <div className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] to-[#818cf8]" />
        <button onClick={() => toggle('cadastrados')} className="w-full flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold">{data.totalPeople}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Total Cadastrados</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${expanded === 'cadastrados' ? 'rotate-180' : ''}`} />
        </button>

        {expanded === 'cadastrados' && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1 max-h-[400px] overflow-y-auto">
            {data.allPeople.map((person, idx) => (
              <div key={idx} className="py-2 px-3 rounded-lg hover:bg-[var(--accent)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{person.name}</span>
                  <div className="flex gap-1">
                    {person.roles.map((role, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                {person.ministries.length > 0 && (
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                    {person.ministries.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic role cards (Pastor, Ministro, etc. - excluding Membro) */}
      {data.roleCounts.map((role) => {
        const colors = roleColors[role.name] || defaultRoleColor
        const icon = roleIcons[role.name] || defaultRoleIcon

        return (
          <div key={role.id} className="card relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`} />
            <button onClick={() => toggle(role.id)} className="w-full flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
                  {icon}
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold">{role.count}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{role.name}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${expanded === role.id ? 'rotate-180' : ''}`} />
            </button>

            {expanded === role.id && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1.5 max-h-[400px] overflow-y-auto">
                {role.people.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] text-center py-4">Nenhum {role.name.toLowerCase()} cadastrado.</p>
                ) : (
                  role.people.map((person, idx) => (
                    <div key={idx} className="py-2 px-3 rounded-lg hover:bg-[var(--accent)]">
                      <span className="text-sm font-medium">{person.name}</span>
                      {person.ministries.length > 0 && (
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                          {person.ministries.join(', ')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
