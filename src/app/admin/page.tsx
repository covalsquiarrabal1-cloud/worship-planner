'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Music,
  Settings,
  FileDown,
  Loader2,
  Plus,
} from 'lucide-react'
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

export default function AdminPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
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

  // Build calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  function getEventForDate(date: Date): ScheduleEvent | undefined {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.find((e) => e.event_date === dateStr)
  }

  function hasEvent(date: Date): boolean {
    return !!getEventForDate(date)
  }

  const selectedEvent = selectedDate ? getEventForDate(selectedDate) : null

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
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)] active:bg-[var(--border)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)] active:bg-[var(--border)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar + Detail side by side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Grid */}
        <div className="card p-3 lg:flex-1">
          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-[var(--muted-foreground)] py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day) => {
              const inMonth = isSameMonth(day, currentDate)
              const eventOnDay = hasEvent(day)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const today = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    relative py-2 flex flex-col items-center justify-center rounded-md text-sm transition-all
                    ${!inMonth ? 'opacity-30' : ''}
                    ${isSelected ? 'bg-white text-black font-bold' : ''}
                    ${!isSelected && today ? 'ring-1 ring-white/50' : ''}
                    ${!isSelected && eventOnDay ? 'bg-[var(--accent)]' : ''}
                    ${!isSelected && !eventOnDay && inMonth ? 'hover:bg-[var(--accent)]/50' : ''}
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {eventOnDay && !isSelected && (
                    <div className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                  {eventOnDay && isSelected && (
                    <div className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-green-700" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day detail */}
        <div className="lg:w-72">
          {selectedDate ? (
            <div className="card h-full">
              <div className="mb-2">
                <h3 className="font-semibold text-sm">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <span className="text-xs text-[var(--muted-foreground)] capitalize">
                  {format(selectedDate, 'EEEE', { locale: ptBR })}
                </span>
              </div>

              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : selectedEvent ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">
                      {selectedEvent.scale_type?.name || 'Escala'}
                    </span>
                    <Link
                      href={`/admin/escala/${selectedEvent.id}`}
                      className="text-xs text-[var(--muted-foreground)] underline"
                    >
                      Editar
                    </Link>
                  </div>
                  <div className="space-y-1 text-xs">
                    {selectedEvent.assignments
                      .sort((a, b) => a.role.localeCompare(b.role))
                      .map((a) => (
                        <div
                          key={a.id}
                          className="flex justify-between bg-[var(--accent)] px-2 py-1.5 rounded"
                        >
                          <span className="text-[var(--muted-foreground)]">
                            {roleLabels[a.role] || a.role}
                          </span>
                          <span className="font-medium">{a.member?.name || '-'}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Nenhuma celebração neste dia.
                </p>
              )}
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center">
              <p className="text-xs text-[var(--muted-foreground)]">
                Selecione um dia no calendário
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Link
          href={`/admin/escala/gerar?month=${month}&year=${year}`}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-semibold py-2.5 rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" />
          Gerar Escala
        </Link>
        <Link
          href={`/admin/escala/exportar?month=${month}&year=${year}`}
          className="flex items-center justify-center gap-2 bg-[var(--accent)] px-4 py-2.5 rounded-xl"
        >
          <FileDown className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick menu */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Menu</h3>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/admin/membros"
            className="card flex flex-col items-center gap-1.5 py-3"
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">Membros</span>
          </Link>
          <Link
            href="/admin/musicas"
            className="card flex flex-col items-center gap-1.5 py-3"
          >
            <Music className="w-5 h-5" />
            <span className="text-xs font-medium">Músicas</span>
          </Link>
          <Link
            href="/admin/config"
            className="card flex flex-col items-center gap-1.5 py-3"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs font-medium">Config</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
