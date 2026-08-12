'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, Crown, UserCircle, Home, Users, ChevronDown } from 'lucide-react'
import { getMinistryIcon3D } from '@/lib/ministry-icons'

interface DashboardData {
  ministryCounts: { id: string; name: string; slug: string; count: number }[]
  totalPeople: number
  allPeople: { name: string; email: string; roles: string[]; ministries: string[] }[]
  roleCounts: { id: string; name: string; count: number; people: { name: string; email: string; ministries: string[] }[] }[]
}

export default function DashboardStaffPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  if (!data) return null

  const pastores = data.roleCounts.find(r => r.name === 'Pastor')
  const ministros = data.roleCounts.find(r => r.name === 'Ministro')

  const cards = [
    { id: 'pastores', title: 'Pastores', count: pastores?.count || 0, icon: <Crown className="w-7 h-7" />, color: '#a855f7' },
    { id: 'ministros', title: 'Ministros', count: ministros?.count || 0, icon: <UserCircle className="w-7 h-7" />, color: '#f59e0b' },
    { id: 'ministerios', title: 'Ministérios', count: data.ministryCounts.length, icon: <Home className="w-7 h-7" />, color: '#22c55e' },
    { id: 'membros', title: 'Membros', count: data.totalPeople, icon: <Users className="w-7 h-7" />, color: '#6366f1' },
  ]

  function toggle(id: string) { setExpanded(prev => prev === id ? null : id) }

  return (
    <div className="max-w-md mx-auto px-4 pb-8">
      <h2 className="text-xl font-bold text-center mb-6">Dashboard</h2>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4 relative">
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
          <line x1="46%" y1="25%" x2="54%" y2="25%" stroke="#58a6ff" strokeWidth="2" strokeDasharray="6 8" className="animate-border-flow" opacity="0.5" />
          <line x1="46%" y1="75%" x2="54%" y2="75%" stroke="#58a6ff" strokeWidth="2" strokeDasharray="6 8" className="animate-border-flow" opacity="0.5" />
          <line x1="25%" y1="46%" x2="25%" y2="54%" stroke="#58a6ff" strokeWidth="2" strokeDasharray="6 8" className="animate-border-flow" opacity="0.5" />
          <line x1="75%" y1="46%" x2="75%" y2="54%" stroke="#58a6ff" strokeWidth="2" strokeDasharray="6 8" className="animate-border-flow" opacity="0.5" />
          <line x1="42%" y1="44%" x2="58%" y2="56%" stroke="#58a6ff" strokeWidth="1.5" strokeDasharray="4 10" className="animate-border-flow" opacity="0.3" />
          <line x1="58%" y1="44%" x2="42%" y2="56%" stroke="#58a6ff" strokeWidth="1.5" strokeDasharray="4 10" className="animate-border-flow" opacity="0.3" />
        </svg>

        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => toggle(card.id)}
            className="relative rounded-2xl overflow-hidden active:scale-95 transition-transform z-10"
            style={{ aspectRatio: '3/4' }}
          >
            <div className="absolute inset-0 rounded-2xl border-flow-card" style={{ '--flow-color': card.color } as React.CSSProperties} />
            <div className="absolute inset-[2px] rounded-[14px] bg-[#0d1117]" />
            <div className="relative h-full flex flex-col items-center justify-center p-4 gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${card.color}20` }}>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <p className="text-3xl font-bold">{card.count}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{card.title}</p>
              <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] absolute top-3 right-3 transition-transform ${expanded === card.id ? 'rotate-180' : ''}`} />
            </div>
          </button>
        ))}
      </div>

      {/* Modal overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setExpanded(null)}
        >
          <div
            className="w-full max-w-sm max-h-[70vh] rounded-2xl overflow-hidden relative"
            onClick={e => e.stopPropagation()}
            style={{ border: `1.5px solid ${cards.find(c => c.id === expanded)?.color}40` }}
          >
            <div className="bg-[#0d1117] px-7 py-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${cards.find(c => c.id === expanded)?.color}20` }}>
                  <span style={{ color: cards.find(c => c.id === expanded)?.color }}>
                    {cards.find(c => c.id === expanded)?.icon}
                  </span>
                </div>
                <div>
                  <p className="font-bold">{cards.find(c => c.id === expanded)?.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{cards.find(c => c.id === expanded)?.count} total</p>
                </div>
              </div>
              <button onClick={() => setExpanded(null)} className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-white">
                ✕
              </button>
            </div>

            <div className="bg-[#0d1117] px-7 py-5 overflow-y-auto max-h-[55vh]">
              {expanded === 'ministerios' && (
                <div className="space-y-1.5">
                  {data.ministryCounts.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-2.5 px-4 rounded-xl hover:bg-[var(--accent)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
                          <img src={getMinistryIcon3D(m.slug)} alt={m.name} className="w-5 h-5 object-contain" />
                        </div>
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                      <span className="text-sm font-bold text-[#58a6ff]">{m.count}</span>
                    </div>
                  ))}
                </div>
              )}

              {expanded === 'membros' && (
                <div className="space-y-1">
                  {data.allPeople.map((person, idx) => (
                    <div key={idx} className="py-2.5 px-4 rounded-xl hover:bg-[var(--accent)] transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{person.name}</span>
                        <div className="flex gap-1">
                          {person.roles.map((role, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">{role}</span>
                          ))}
                        </div>
                      </div>
                      {person.ministries.length > 0 && (
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{person.ministries.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(expanded === 'pastores' || expanded === 'ministros') && (
                <div className="space-y-1.5">
                  {(() => {
                    const role = expanded === 'pastores' ? pastores : ministros
                    const people = role?.people || []
                    return people.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)] text-center py-6">Nenhum cadastrado.</p>
                    ) : people.map((person, idx) => (
                      <div key={idx} className="py-2.5 px-6 rounded-xl hover:bg-[var(--accent)] transition-colors">
                        <span className="text-sm font-medium">{person.name}</span>
                        {person.ministries.length > 0 && (
                          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{person.ministries.join(', ')}</p>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
