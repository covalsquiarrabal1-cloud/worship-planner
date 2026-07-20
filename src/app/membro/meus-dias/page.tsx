'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react'

interface MyEvent {
  role: string
  schedule_event: {
    event_date: string
    day_of_week: string
    scale_type: { name: string } | null
  }
}

export default function MeusDiasPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [myEvents, setMyEvents] = useState<MyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [memberName, setMemberName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadMyEvents()
  }, [currentDate])

  async function loadMyEvents() {
    setLoading(true)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Find member linked to this user email
    const { data: member } = await supabase
      .from('members')
      .select('id, name')
      .eq('email', user.email)
      .single()

    if (!member) {
      setLoading(false)
      return
    }

    setMemberName(member.name)

    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('schedule_assignments')
      .select(`
        role,
        schedule_event:schedule_events(
          event_date,
          day_of_week,
          scale_type:scale_types(name)
        )
      `)
      .eq('member_id', member.id)

    // Filter by date range client-side (nested filter limitation)
    const filtered = (data as unknown as MyEvent[])?.filter(e => {
      const date = e.schedule_event?.event_date
      return date && date >= start && date <= end
    }) || []

    filtered.sort((a, b) =>
      a.schedule_event.event_date.localeCompare(b.schedule_event.event_date)
    )

    setMyEvents(filtered)
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
          <p className="text-xs mt-1">Verifique se seu e-mail está vinculado ao cadastro.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myEvents.map((ev, idx) => (
            <div key={idx} className="card flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[var(--accent)] flex flex-col items-center justify-center">
                <span className="text-lg font-bold">
                  {format(new Date(ev.schedule_event.event_date + 'T12:00:00'), 'dd')}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] capitalize">
                  {ev.schedule_event.day_of_week.slice(0, 3)}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{ev.schedule_event.scale_type?.name || '-'}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {roleLabels[ev.role] || ev.role}
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
    </div>
  )
}
