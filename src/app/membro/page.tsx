'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface ScheduleEvent {
  id: string
  event_date: string
  day_of_week: string
  week_number: number
  scale_type: { name: string } | null
  assignments: {
    role: string
    member: { name: string } | null
  }[]
}

export default function MemberSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [memberName, setMemberName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadMemberInfo()
  }, [])

  useEffect(() => {
    loadEvents()
  }, [currentDate])

  async function loadMemberInfo() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (profile?.full_name) {
      setMemberName(profile.full_name)
    } else {
      // Fallback: try to get name from members table by email
      const { data: member } = await supabase
        .from('members')
        .select('name')
        .eq('email', user.email)
        .single()
      if (member?.name) {
        setMemberName(member.name)
      }
    }
  }

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
        scale_type:scale_types(name),
        assignments:schedule_assignments(
          role,
          member:members(name)
        )
      `)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date')

    setEvents((data as unknown as ScheduleEvent[]) || [])
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

  const groupedByWeek = events.reduce((acc, event) => {
    const week = event.week_number
    if (!acc[week]) acc[week] = []
    acc[week].push(event)
    return acc
  }, {} as Record<number, ScheduleEvent[]>)

  return (
    <div className="space-y-4">
      {/* Greeting */}
      {memberName && (
        <div className="card border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--accent)]">
          <h2 className="text-lg font-bold mb-2">Olá, {memberName}! 👋</h2>
          <p className="text-sm text-[var(--muted-foreground)] italic leading-relaxed">
            &ldquo;Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.&rdquo;
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Josué 1:9</p>
        </div>
      )}

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

      {/* Events */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <p>Nenhuma escala publicada para este mês.</p>
        </div>
      ) : (
        Object.entries(groupedByWeek).map(([week, weekEvents]) => (
          <div key={week} className="space-y-2">
            <h3 className="text-sm font-medium text-[var(--muted-foreground)]">Semana {week}</h3>
            {weekEvents.map((event) => (
              <div key={event.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-[var(--muted-foreground)] capitalize">
                      {event.day_of_week}, {format(new Date(event.event_date + 'T12:00:00'), 'dd/MM')}
                    </span>
                    <h4 className="font-semibold">{event.scale_type?.name || '-'}</h4>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {event.assignments
                    .sort((a, b) => a.role.localeCompare(b.role))
                    .map((a, idx) => (
                      <div key={idx} className="flex justify-between bg-[var(--accent)] px-2 py-1 rounded">
                        <span className="text-[var(--muted-foreground)]">{roleLabels[a.role] || a.role}</span>
                        <span className="font-medium">{a.member?.name || '-'}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
