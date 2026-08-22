'use client'

import { useState, useEffect } from 'react'
import { Loader2, ArrowLeft, Users } from 'lucide-react'
import { getMinistryIcon3D } from '@/lib/ministry-icons'

interface Ministry {
  id: string
  name: string
  slug: string
  leader_name: string | null
  group_name: string | null
}

interface MinistryMember {
  id: string
  name: string
  email: string | null
  role: string
  nickname?: string | null
}

const GROUP_ORDER = ['Integração', 'Culto', 'Esporte', 'Comunidade', 'Espiritual', 'Operacional', 'Alive', 'Comunicação', 'Administrativo', 'Outros']

export default function MinisteriosStaffPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null)
  const [members, setMembers] = useState<MinistryMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => { loadMinistries() }, [])

  async function loadMinistries() {
    const res = await fetch('/api/ministries')
    if (res.ok) {
      const data = await res.json()
      setMinistries(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  async function openMinistry(m: Ministry) {
    setSelectedMinistry(m)
    setLoadingMembers(true)
    const res = await fetch(`/api/ministries/${m.slug}/members`)
    if (res.ok) setMembers(await res.json())
    else setMembers([])
    setLoadingMembers(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  // Show ministry detail
  if (selectedMinistry) {
    const leaders = members.filter(m => m.role === 'lider' || m.role === 'ambos')
    const regularMembers = members.filter(m => m.role === 'membro' || m.role === 'ambos')

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedMinistry(null)} className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
              <img src={getMinistryIcon3D(selectedMinistry.slug)} alt={selectedMinistry.name} className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{selectedMinistry.name}</h2>
              {selectedMinistry.leader_name && (
                <p className="text-xs text-[var(--muted-foreground)]">Líder: {selectedMinistry.leader_name}</p>
              )}
            </div>
          </div>
        </div>

        {loadingMembers ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Leaders */}
            {leaders.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                  👑 Líderes ({leaders.length})
                </h3>
                {leaders.map(m => (
                  <div key={m.id} className="card flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">
                      {(m.nickname || m.name).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.nickname || m.name}</p>
                      {m.name !== m.nickname && m.nickname && (
                        <p className="text-[10px] text-[var(--muted-foreground)]">{m.name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Members */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-[#58a6ff] flex items-center gap-2">
                <Users className="w-4 h-4" /> Membros ({regularMembers.length})
              </h3>
              {regularMembers.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] italic card py-4 text-center">Nenhum membro cadastrado.</p>
              ) : (
                <div className="grid gap-2">
                  {regularMembers.map(m => (
                    <div key={m.id} className="card flex items-center gap-3 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#58a6ff]/20 flex items-center justify-center text-[#58a6ff] text-xs font-bold">
                        {(m.nickname || m.name).charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium">{m.nickname || m.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Total */}
            <div className="card flex items-center justify-between bg-[var(--accent)]">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-bold text-[#58a6ff]">{members.length}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Ministry grid with icons
  const groupMap: Record<string, Ministry[]> = {}
  for (const m of ministries) {
    const group = m.group_name || 'Outros'
    if (!groupMap[group]) groupMap[group] = []
    groupMap[group].push(m)
  }

  const groups = GROUP_ORDER
    .filter(g => groupMap[g] && groupMap[g].length > 0)
    .map(g => groupMap[g])

  const extraGroups = Object.keys(groupMap)
    .filter(g => !GROUP_ORDER.includes(g))
    .map(g => groupMap[g])
    .filter(g => g.length > 0)

  const allGroups = [...groups, ...extraGroups]

  return (
    <div className="flex flex-col items-center px-3 pb-28">
      <div className="text-center pt-2 pb-4">
        <h2 className="text-lg font-bold">Ministérios</h2>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Toque em um ministério para ver líderes e membros</p>
      </div>

      {allGroups.map((items, idx) => (
        <div
          key={idx}
          className="w-[85%] max-w-[360px] aspect-square rounded-[32px] p-6 flex flex-wrap items-center justify-center content-center gap-5 relative overflow-hidden"
          style={{ background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(12px)', marginBottom: '30px' }}
        >
          {/* Animated flowing border */}
          <div className="absolute inset-0 rounded-[32px] animate-spin-slow" style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(88,166,255,0.4) 10%, transparent 20%, rgba(88,166,255,0.2) 40%, transparent 50%, rgba(88,166,255,0.4) 70%, transparent 80%)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '1.5px',
          }} />
          {/* Inner background */}
          <div className="absolute inset-[1.5px] rounded-[31px] bg-[#0d1117]/90" />

          {/* Icons */}
          <div className="relative z-10 flex flex-wrap items-center justify-center content-center gap-5">
            {items.map(m => (
              <button
                key={m.id}
                onClick={() => openMinistry(m)}
                className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
              >
                <div className="relative w-[77px] h-[77px] rounded-[16px] flex items-center justify-center group">
                  <div className="absolute inset-0 rounded-[16px] opacity-60 group-hover:opacity-100 transition-opacity" style={{
                    background: 'linear-gradient(135deg, rgba(88,166,255,0.3), rgba(88,166,255,0.1), rgba(88,166,255,0.3))',
                    boxShadow: '0 0 12px rgba(88,166,255,0.15), inset 0 0 12px rgba(88,166,255,0.05)',
                  }} />
                  <div className="absolute inset-[1px] rounded-[15px] bg-[#1c2128] flex items-center justify-center">
                    <img
                      src={getMinistryIcon3D(m.slug)}
                      alt={m.name}
                      className="w-[48px] h-[48px] object-contain"
                    />
                  </div>
                </div>
                <span className="text-[11px] text-center leading-tight font-medium w-[80px] break-words">{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
