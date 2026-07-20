'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, FileDown, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface ScheduleEvent {
  id: string
  event_date: string
  day_of_week: string
  week_number: number
  scale_type: { id: string; name: string; type: string } | null
  assignments: {
    id: string
    role: string
    member: { id: string; name: string } | null
  }[]
}

export default function AdminSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => {
    loadEvents()
  }, [month, year])

  async function loadEvents() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('schedule_events')
      .select(`
        id,
        event_date,
        day_of_week,
        week_number,
        scale_type:scale_types(id, name, type),
        assignments:schedule_assignments(
          id,
          role,
          member:members(id, name)
        )
      `)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date')

    setEvents((data as unknown as ScheduleEvent[]) || [])
    setLoading(false)
  }

  const groupedByWeek = events.reduce((acc, event) => {
    const week = event.week_number
    if (!acc[week]) acc[week] = []
    acc[week].push(event)
    return acc
  }, {} as Record<number, ScheduleEvent[]>)

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Link
          href={`/admin/escala/gerar?month=${month}&year=${year}`}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Gerar Escala
        </Link>
        <Link
          href={`/admin/escala/exportar?month=${month}&year=${year}`}
          className="flex items-center justify-center gap-2 bg-[var(--accent)] px-4 py-3 rounded-xl"
        >
          <FileDown className="w-4 h-4" />
        </Link>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <p>Nenhuma escala gerada para este mês.</p>
          <p className="text-sm mt-1">Clique em &quot;Gerar Escala&quot; para começar.</p>
        </div>
      ) : (
        Object.entries(groupedByWeek).map(([week, weekEvents]) => (
          <div key={week} className="space-y-2">
            <h3 className="text-sm font-medium text-[var(--muted-foreground)]">
              Semana {week}
            </h3>
            {weekEvents.map((event) => (
              <Link
                key={event.id}
                href={`/admin/escala/${event.id}`}
                className="card block"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {format(new Date(event.event_date + 'T12:00:00'), 'dd/MM')} - {event.day_of_week}
                    </span>
                    <h4 className="font-semibold">
                      {event.scale_type?.name || 'Sem tipo'}
                    </h4>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                </div>
                {event.assignments.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {event.assignments
                      .filter(a => a.role === 'vocal_1')
                      .map(a => (
                        <span key={a.id} className="text-xs bg-[var(--accent)] px-2 py-0.5 rounded">
                          {a.member?.name}
                        </span>
                      ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
