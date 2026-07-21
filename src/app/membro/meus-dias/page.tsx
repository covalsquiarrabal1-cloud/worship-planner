'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react'

interface ScheduleEvent {
  id: string
  event_date: string
  day_of_week: string
  week_number: number
  scale_type: { id: string; name: string } | null
  assignments: {
    id: string
    role: string
    member: { id: string; name: string } | null
  }[]
}

export default function MeusDiasPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [myEvents, setMyEvents] = useState<{ event: ScheduleEvent; role: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [memberName, setMemberName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadMyEvents()
  }, [currentDate])

  async function loadMyEvents() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Get member name from members table
    const { data: member } = await supabase
      .from('members')
      .select('name')
      .eq('email', user.email)
      .single()

    const name = member?.name || ''
    setMemberName(name)

    if (!name) { setLoading(false); return }

    // Fetch all events for the month via API
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const res = await fetch(`/api/schedule-events?start=${start}&end=${end}`)
    if (!res.ok) { setLoading(false); return }

    const events: ScheduleEvent[] = await res.json()

    // Filter events where this member is assigned
    const myDays: { event: ScheduleEvent; role: string }[] = []
    for (const event of events) {
      for (const assignment of event.assignments) {
        if (assignment.member?.name?.toUpperCase() === name.toUpperCase()) {
          myDays.push({ event, role: assignment.role })
          break
        }
      }
    }

    myDays.sort((a, b) => a.event.event_date.localeCompare(b.event.event_date))
    setMyEvents(myDays)
    setLoading(false)
  }

  const roleLabels: Record<string, string> = {
    vocal_1: 'Vocal 1',
    vocal_2: 'Vocal 2',
    vocal_3: 'Vocal 3',
    guitarra: 'Guitarra',
    baixo: 'Baixo',
    bateria: 'Bateria',
    teclado: 'Teclado',
    back: 'Back',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Meus Dias</h2>
      {memberName && (
        <p className="text-sm text-[var(--muted-foreground)]">
          Olá, {memberName}! Aqui estão seus dias de escala.
        </p>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : myEvents.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma escala encontrada para este mês.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myEvents.map((item, idx) => (
            <div key={idx} className="card flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[var(--accent)] flex flex-col items-center justify-center shrink-0">
                <span className="text-lg font-bold">
                  {format(new Date(item.event.event_date + 'T12:00:00'), 'dd')}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] capitalize">
                  {item.event.day_of_week.slice(0, 3)}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-400">{item.event.scale_type?.name || '-'}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {roleLabels[item.role] || item.role}
                </p>
              </div>
            </div>
          ))}
          <div className="card bg-[var(--accent)] text-center">
            <p className="text-sm">
              <span className="font-semibold">{myEvents.length}</span> escalações este mês
            </p>
          </div>
        </div>
      )}

      {/* Bottom spacer for fixed nav */}
      <div className="h-24" />
    </div>
  )
}
