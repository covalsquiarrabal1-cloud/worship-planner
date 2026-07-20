'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
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
    <div className="space-y-6">
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

      {/* Calendar Grid */}
      <div className="card p-3">
        {/* Week day headers */}
        <div className="grid grid-cols-7 mb-2">
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
        <div className="grid grid-cols-7 gap-1">
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
                  relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all
                  ${!inMonth ? 'opacity-30' : ''}
                  ${isSelected ? 'bg-white text-black font-bold' : ''}
                  ${!isSelected && today ? 'ring-1 ring-white/50' : ''}
                  ${!isSelected && eventOnDay ? 'bg-[var(--accent)]' : ''}
                  ${!isSelected && !eventOnDay && inMonth ? 'hover:bg-[var(--accent)]/50' : ''}
                `}
              >
                <span>{format(day, 'd')}</span>
                {eventOnDay && !isSelected && (
                  <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-green-400" />
                )}
                {eventOnDay && isSelected && (
                  <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-green-700" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              <span className="text-sm font-normal text-[var(--muted-foreground)] ml-2 capitalize">
                {format(selectedDate, 'EEEE', { locale: ptBR })}
              </span>
            </h3>
          </div>

          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : selectedEvent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-medium">
                  {selectedEvent.scale_type?.name || 'Escala'}
                </span>
                <Link
                  href={`/admin/escala/${selectedEvent.id}`}
                  className="text-xs text-[var(--muted-foreground)] underline"
                >
                  Editar →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
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
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhuma celebração neste dia.
            </p>
          )}
        </div>
      )}

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

      {/* Quick menu */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-[var(--muted-foreground)]">Menu</h3>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/admin/membros"
            className="card flex flex-col items-center gap-2 py-4"
          >
            <Users className="w-6 h-6" />
            <span className="text-xs font-medium">Membros</span>
          </Link>
          <Link
            href="/admin/musicas"
            className="card flex flex-col items-center gap-2 py-4"
          >
            <Music className="w-6 h-6" />
            <span className="text-xs font-medium">Músicas</span>
          </Link>
          <Link
            href="/admin/config"
            className="card flex flex-col items-center gap-2 py-4"
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">Config</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
