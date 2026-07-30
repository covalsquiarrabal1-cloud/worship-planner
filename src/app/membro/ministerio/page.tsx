'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Mic } from 'lucide-react'

interface MinistryEvent {
  id: string
  event_date: string
  day_of_week: string
  week_number: number
  scale_name: string | null
  num_celebrations: number
  ministry_name: string
  ministry_slug: string
  assignments: {
    id: string
    celebration_number: number
    member: { id: string; name: string } | null
  }[]
}

const ministryIcons: Record<string, string> = {
  som: '🔊',
  iluminacao: '💡',
  projecao: '📽',
  backstage: '🚪',
}

export default function MinisterioMembroPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<MinistryEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [currentDate])

  async function loadEvents() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const res = await fetch(`/api/minha-escala-ministerio?start=${start}&end=${end}`)
    if (res.ok) {
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : [])
    } else {
      setEvents([])
    }
    setLoading(false)
  }

  // Group events by date
  const groupedByDate = events.reduce((acc, event) => {
    if (!acc[event.event_date]) acc[event.event_date] = []
    acc[event.event_date].push(event)
    return acc
  }, {} as Record<string, MinistryEvent[]>)

  const sortedDates = Object.keys(groupedByDate).sort()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Mic className="w-5 h-5 text-[#58a6ff]" />
        <h2 className="text-xl font-bold">Minha Escala - Ministérios</h2>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        Seus dias escalados nos ministérios técnicos.
      </p>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-semibold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="card text-center py-8">
          <Mic className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhuma escala de ministério para este mês.
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Se você faz parte de um ministério técnico, o líder publicará sua escala aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(dateStr => {
            const dateObj = new Date(dateStr + 'T12:00:00')
            const dayEvents = groupedByDate[dateStr]
            return (
              <div key={dateStr} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-[var(--accent)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold">{format(dateObj, 'dd')}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] capitalize">
                      {format(dateObj, 'EEE', { locale: ptBR })}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {format(dateObj, 'EEEE', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {format(dateObj, 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {dayEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-[var(--accent)]">
                      <span className="text-lg">
                        {ministryIcons[event.ministry_slug] || '🎭'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{event.ministry_name}</p>
                        {event.scale_name && (
                          <p className="text-xs text-green-400">{event.scale_name}</p>
                        )}
                        {event.num_celebrations > 1 && (
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {event.num_celebrations} celebrações
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Summary */}
          <div className="card bg-[var(--accent)] text-center">
            <p className="text-sm">
              <span className="font-semibold">{events.length}</span> escalação{events.length > 1 ? 'ões' : ''} este mês
            </p>
          </div>
        </div>
      )}

      {/* Bottom spacer */}
      <div className="h-24" />
    </div>
  )
}
