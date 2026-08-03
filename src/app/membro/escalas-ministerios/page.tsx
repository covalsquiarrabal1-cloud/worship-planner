'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Home } from 'lucide-react'

interface Ministry {
  id: string
  name: string
  slug: string
}

interface MinistryEvent {
  id: string
  event_date: string
  day_of_week: string
  scale_name: string | null
  num_celebrations: number
  assignments: { id: string; celebration_number: number; role_name: string | null; member: { id: string; name: string } | null }[]
}

export default function EscalasMinisteriosPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null)
  const [events, setEvents] = useState<MinistryEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadMinistries()
  }, [])

  useEffect(() => {
    if (selectedMinistry) loadEvents()
  }, [selectedMinistry, currentDate])

  async function loadMinistries() {
    const res = await fetch('/api/ministries')
    if (res.ok) {
      const data = await res.json()
      setMinistries(data.filter((m: any) => m.slug !== 'louvor'))
    }
    setLoading(false)
  }

  async function loadEvents() {
    setLoadingEvents(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
    const ministry = ministries.find(m => m.id === selectedMinistry)
    if (!ministry) { setLoadingEvents(false); return }

    const res = await fetch(`/api/ministries/${ministry.slug}/events?start=${start}&end=${end}`)
    if (res.ok) setEvents(await res.json())
    else setEvents([])
    setLoadingEvents(false)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Escalas dos Ministérios</h2>

      {/* Ministry selector */}
      <div className="flex flex-wrap gap-2">
        {ministries.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedMinistry(m.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors border ${
              selectedMinistry === m.id
                ? 'bg-[#58a6ff] text-white border-[#58a6ff]'
                : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--muted-foreground)]'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {selectedMinistry && (
        <>
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
        </>
      )}
    </div>
  )
}
