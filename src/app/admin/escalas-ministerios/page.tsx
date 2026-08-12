'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { getMinistryIcon3D } from '@/lib/ministry-icons'

interface Ministry {
  id: string
  name: string
  slug: string
  group_name: string | null
}

interface MinistryEvent {
  id: string
  event_date: string
  day_of_week: string
  scale_name: string | null
  num_celebrations: number
  assignments: { id: string; celebration_number: number; role_name: string | null; member: { id: string; name: string } | null }[]
}

const GROUP_ORDER = ['Integração', 'Culto', 'Esporte', 'Comunidade', 'Espiritual', 'Operacional', 'Alive', 'Comunicação', 'Administrativo', 'Outros']

export default function EscalasMinisteriosAdminPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null)
  const [events, setEvents] = useState<MinistryEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [bgImage, setBgImage] = useState<string | null>(null)
  const [ministriesWithSchedule, setMinistriesWithSchedule] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadMinistries()
    loadBackground()
  }, [])

  useEffect(() => {
    if (ministries.length > 0) loadScheduleStatus()
  }, [ministries, currentDate])

  async function loadBackground() {
    const res = await fetch('/api/app-settings?key=escalas_gerais_bg')
    if (res.ok) {
      const data = await res.json()
      if (data.value) setBgImage(data.value)
    }
  }

  useEffect(() => {
    if (selectedMinistry) loadEvents()
  }, [selectedMinistry, currentDate])

  async function loadMinistries() {
    const res = await fetch('/api/ministries')
    if (res.ok) {
      const data = await res.json()
      // Add Louvor as a virtual ministry (it uses separate tables)
      const louvor = { id: 'louvor', name: 'Louvor', slug: 'louvor', group_name: 'Culto' }
      const filtered = data.filter((m: any) => m.slug !== 'louvor')
      setMinistries([louvor, ...filtered])
    }
    setLoading(false)
  }

  async function loadScheduleStatus() {
    const month = currentDate.getMonth() + 1
    const year = currentDate.getFullYear()
    const res = await fetch(`/api/ministries/schedule-status-all?month=${month}&year=${year}`)
    if (res.ok) {
      const data = await res.json()
      setMinistriesWithSchedule(new Set(data.ministryIds || []))
    }
  }

  async function loadEvents() {
    setLoadingEvents(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
    const ministry = ministries.find(m => m.id === selectedMinistry)
    if (!ministry) { setLoadingEvents(false); return }

    if (ministry.slug === 'louvor') {
      // Louvor uses different API
      const res = await fetch(`/api/schedule-events?start=${start}&end=${end}`)
      if (res.ok) {
        const data = await res.json()
        const transformed = data.map((e: any) => ({
          id: e.id,
          event_date: e.event_date,
          day_of_week: e.day_of_week,
          scale_name: e.scale_type?.name || null,
          num_celebrations: 1,
          assignments: (e.assignments || []).map((a: any) => ({
            id: a.id,
            celebration_number: 1,
            role_name: a.role || 'Membro',
            member: a.member ? { id: a.member.id, name: a.member.name, nickname: null } : null,
          })),
        }))
        setEvents(transformed)
      } else setEvents([])
    } else {
      const res = await fetch(`/api/ministries/${ministry.slug}/events?start=${start}&end=${end}`)
      if (res.ok) setEvents(await res.json())
      else setEvents([])
    }
    setLoadingEvents(false)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  const selectedMinistryData = ministries.find(m => m.id === selectedMinistry)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Escalas Gerais</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Selecione um ministério para ver a escala.</p>
      </div>

      {/* Ministry grid with background */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Background */}
        {bgImage ? (
          <div className="absolute inset-0">
            <img src={bgImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c2128] via-[#161b22] to-[#0d1117] border border-[var(--border)] rounded-2xl" />
        )}

        {/* Grid of ministry icons - grouped */}
        <div className="relative z-10 p-6">
          {(() => {
            // Group ministries
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
              <div className="space-y-6">
                {allGroups.map((items, idx) => (
                  <div key={idx} className="flex flex-wrap justify-center gap-4">
                    {items.map(m => (
                      m.slug === 'louvor' ? (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMinistry(m.id)}
                        className="flex flex-col items-center gap-1.5 transition-all active:scale-90 hover:scale-105"
                      >
                        <div className={`relative w-[60px] h-[60px] rounded-[14px] flex items-center justify-center shadow-lg transition-all ${
                          ministriesWithSchedule.has(m.id)
                            ? 'glow-border-green'
                            : 'bg-[#1c2128]/80 border border-[#30363d]/60 hover:border-[#58a6ff]/50'
                        }`}>
                          <div className="w-full h-full rounded-[14px] flex items-center justify-center">
                            <img src={getMinistryIcon3D(m.slug)} alt={m.name} className="w-[36px] h-[36px] object-contain" />
                          </div>
                        </div>
                        <span className="text-[9px] text-center leading-tight font-medium w-[65px] break-words text-[var(--muted-foreground)]">{m.name}</span>
                      </button>
                      ) : (
                      <a
                        key={m.id}
                        href={`/admin/ministerios/${m.slug}`}
                        className="flex flex-col items-center gap-1.5 transition-all active:scale-90 hover:scale-105"
                      >
                        <div className={`relative w-[60px] h-[60px] rounded-[14px] flex items-center justify-center shadow-lg transition-all ${
                          ministriesWithSchedule.has(m.id)
                            ? 'glow-border-green'
                            : 'bg-[#1c2128]/80 border border-[#30363d]/60 hover:border-[#58a6ff]/50'
                        }`}>
                          {ministriesWithSchedule.has(m.id) && (
                            <div className="absolute inset-[-2px] rounded-[16px] animate-spin-slow" style={{
                              background: 'conic-gradient(from 0deg, transparent, #22c55e, #4ade80, transparent, #22c55e, transparent)',
                              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              maskComposite: 'xor',
                              WebkitMaskComposite: 'xor',
                              padding: '2px',
                              borderRadius: '16px',
                            }} />
                          )}
                          <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                            ministriesWithSchedule.has(m.id) ? 'bg-[#1c2128]' : ''
                          }`}>
                            <img
                              src={getMinistryIcon3D(m.slug)}
                              alt={m.name}
                              className="w-[36px] h-[36px] object-contain"
                            />
                          </div>
                        </div>
                        <span className={`text-[9px] text-center leading-tight font-medium w-[65px] break-words ${
                          ministriesWithSchedule.has(m.id) ? 'text-green-400' : 'text-[var(--muted-foreground)]'
                        }`}>
                          {m.name}
                        </span>
                      </a>
                      )
                    ))}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Selected ministry schedule */}
      {selectedMinistry && selectedMinistryData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">{selectedMinistryData.name}</h3>
            <button onClick={() => setSelectedMinistry(null)} className="text-xs text-[var(--muted-foreground)]">✕ Fechar</button>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {loadingEvents ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : events.length === 0 ? (
            <div className="card text-center py-8 text-[var(--muted-foreground)]">
              <p className="text-sm">Nenhuma escala para este mês.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="card space-y-2">
                  <div>
                    <span className="text-xs text-[var(--muted-foreground)] capitalize">{event.day_of_week}, {event.event_date.slice(8,10)}/{event.event_date.slice(5,7)}</span>
                    {event.scale_name && <span className="text-xs text-green-400 ml-2 font-medium">{event.scale_name}</span>}
                  </div>
                  <div className="space-y-1">
                    {event.assignments.sort((a, b) => a.celebration_number - b.celebration_number).map(a => (
                      <div key={a.id} className="flex items-center gap-2">
                        {event.num_celebrations > 1 && (
                          <span className="text-[10px] text-[var(--muted-foreground)]">C{a.celebration_number}:</span>
                        )}
                        <span className="text-sm font-medium">{a.member?.name || '-'}</span>
                        {a.role_name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#58a6ff]/15 text-[#58a6ff] font-medium">{a.role_name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
