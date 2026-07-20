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
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => {
    loadEvents()
    setSelectedDates([]) // Clear selection when month changes
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

  function isSelected(date: Date): boolean {
    return selectedDates.some((d) => isSameDay(d, date))
  }

  function toggleDate(date: Date) {
    if (!isSameMonth(date, currentDate)) return
    setSelectedDates((prev) => {
      if (prev.some((d) => isSameDay(d, date))) {
        return prev.filter((d) => !isSameDay(d, date))
      }
      return [...prev, date].sort((a, b) => a.getTime() - b.getTime())
    })
  }

  function handleGerarEscala() {
    const dates = selectedDates.map((d) => format(d, 'yyyy-MM-dd')).join(',')
    router.push(`/admin/escala/gerar?month=${month}&year=${year}&dates=${dates}`)
  }

  // Get details for selected dates that have events
  const selectedEvents = selectedDates
    .map((d) => ({ date: d, event: getEventForDate(d) }))
    .filter((item) => item.event)

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
              const selected = isSelected(day)
              const today = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => toggleDate(day)}
                  disabled={!inMonth}
                  className={`
                    relative py-2 flex flex-col items-center justify-center rounded-md text-sm transition-all
                    ${!inMonth ? 'opacity-20 cursor-default' : 'cursor-pointer'}
                    ${selected ? 'bg-white text-black font-bold' : ''}
                    ${!selected && today ? 'ring-1 ring-white/50' : ''}
                    ${!selected && eventOnDay ? 'bg-green-500/20' : ''}
                    ${!selected && !eventOnDay && inMonth ? 'hover:bg-[var(--accent)]' : ''}
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {eventOnDay && !selected && (
                    <div className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                  {eventOnDay && selected && (
                    <div className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-green-700" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Selection info */}
          {selectedDates.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-xs text-[var(--muted-foreground)]">
                {selectedDates.length} dia{selectedDates.length > 1 ? 's' : ''} selecionado{selectedDates.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setSelectedDates([])}
                className="text-xs text-red-400 hover:underline"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        {/* Right panel: selected days detail */}
        <div className="lg:w-72 space-y-2">
          {selectedDates.length > 0 ? (
            <>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedDates.map((date) => {
                  const event = getEventForDate(date)
                  return (
                    <div key={date.toISOString()} className="card py-2 px-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">
                            {format(date, 'dd/MM')}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)] ml-2 capitalize">
                            {format(date, 'EEE', { locale: ptBR })}
                          </span>
                        </div>
                        {event && (
                          <Link
                            href={`/admin/escala/${event.id}`}
                            className="text-xs text-green-400 font-medium"
                          >
                            {event.scale_type?.name || 'Escala'}
                          </Link>
                        )}
                      </div>
                      {event && event.assignments.length > 0 && (
                        <div className="mt-1.5 grid grid-cols-1 gap-0.5 text-xs">
                          {event.assignments
                            .sort((a, b) => a.role.localeCompare(b.role))
                            .slice(0, 3)
                            .map((a) => (
                              <div key={a.id} className="flex justify-between text-[var(--muted-foreground)]">
                                <span>{roleLabels[a.role] || a.role}</span>
                                <span className="text-[var(--foreground)]">{a.member?.name || '-'}</span>
                              </div>
                            ))}
                          {event.assignments.length > 3 && (
                            <span className="text-[var(--muted-foreground)]">
                              +{event.assignments.length - 3} mais
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="card h-full flex items-center justify-center min-h-[100px]">
              <p className="text-xs text-[var(--muted-foreground)] text-center">
                Clique nos dias para selecionar<br />as datas de celebração
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleGerarEscala}
          disabled={selectedDates.length === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Gerar Escala {selectedDates.length > 0 && `(${selectedDates.length} dias)`}
        </button>
        <Link
          href="/admin/escala/manual"
          className="flex items-center justify-center gap-2 bg-[var(--accent)] px-4 py-2.5 rounded-xl text-sm"
          title="Criar escala manual"
        >
          <Calendar className="w-4 h-4" />
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
