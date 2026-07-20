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
    try {
      const saved = localStorage.getItem(`selectedDates_${month}_${year}`)
      if (saved) {
        const dates = JSON.parse(saved).map((d: string) => new Date(d + 'T12:00:00'))
        setSelectedDates(dates)
      } else {
        setSelectedDates([])
      }
    } catch {
      setSelectedDates([])
    }
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

  // Calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  function hasEvent(date: Date): boolean {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.some((e) => e.event_date === dateStr)
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
    const dateStrs = selectedDates.map((d) => format(d, 'yyyy-MM-dd'))
    try {
      localStorage.setItem(`selectedDates_${month}_${year}`, JSON.stringify(dateStrs))
    } catch {}
    router.push(`/admin/escala/gerar?month=${month}&year=${year}&dates=${dateStrs.join(',')}`)
  }

  // Helper to get assignment by role
  function getAssignment(event: ScheduleEvent, role: string): string {
    const a = event.assignments.find(a => a.role === role)
    return a?.member?.name || '-'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
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

      {/* Calendar compact + Actions */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Mini Calendar */}
        <div className="card p-3 lg:w-64 shrink-0">
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-[var(--muted-foreground)] py-0.5">
                {day}
              </div>
            ))}
          </div>
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
                    relative py-1 flex flex-col items-center justify-center rounded text-xs transition-all
                    ${!inMonth ? 'opacity-20 cursor-default' : 'cursor-pointer'}
                    ${selected ? 'bg-white text-black font-bold' : ''}
                    ${!selected && today ? 'ring-1 ring-white/50' : ''}
                    ${!selected && eventOnDay ? 'bg-green-500/20' : ''}
                    ${!selected && !eventOnDay && inMonth ? 'hover:bg-[var(--accent)]' : ''}
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {eventOnDay && <div className="absolute bottom-0 w-1 h-1 rounded-full bg-green-400" />}
                </button>
              )
            })}
          </div>
          {selectedDates.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex justify-between items-center">
              <span className="text-[10px] text-[var(--muted-foreground)]">{selectedDates.length} dias</span>
              <button onClick={() => setSelectedDates([])} className="text-[10px] text-red-400">Limpar</button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 lg:w-48">
          <button
            onClick={handleGerarEscala}
            disabled={selectedDates.length === 0}
            className="flex items-center justify-center gap-2 bg-white text-black font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Gerar Escala
          </button>
          <Link
            href="/admin/escala/manual"
            className="flex items-center justify-center gap-2 bg-[var(--accent)] py-2.5 rounded-xl text-sm hover:bg-[var(--border)]"
          >
            <Calendar className="w-4 h-4" />
            Escala Manual
          </Link>
          <Link
            href={`/admin/escala/exportar?month=${month}&year=${year}`}
            className="flex items-center justify-center gap-2 bg-[var(--accent)] py-2.5 rounded-xl text-sm hover:bg-[var(--border)]"
          >
            <FileDown className="w-4 h-4" />
            Exportar
          </Link>
        </div>
      </div>

      {/* === ESCALA TABLE === */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-sm text-[var(--muted-foreground)]">Nenhuma escala gerada para este mês.</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Selecione os dias no calendário e clique &quot;Gerar Escala&quot;.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Sem</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Data</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Dia</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Culto</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Vocal 1</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Vocal 2</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Vocal 3</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Bateria</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Guitarra</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Baixo</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Teclado</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Back</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => {
                const prevEvent = idx > 0 ? events[idx - 1] : null
                const showWeekSeparator = prevEvent && prevEvent.week_number !== event.week_number

                return (
                  <tr
                    key={event.id}
                    className={`border-b border-[var(--border)] hover:bg-[var(--accent)]/50 cursor-pointer ${showWeekSeparator ? 'border-t-2 border-t-[var(--muted-foreground)]/30' : ''}`}
                    onClick={() => router.push(`/admin/escala/${event.id}`)}
                  >
                    <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">{event.week_number}</td>
                    <td className="px-3 py-2 text-xs font-medium">{format(new Date(event.event_date + 'T12:00:00'), 'dd/MM')}</td>
                    <td className="px-3 py-2 text-xs capitalize">{event.day_of_week}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-green-400">{event.scale_type?.name || '-'}</td>
                    <td className="px-3 py-2 text-xs">{getAssignment(event, 'vocal_1')}</td>
                    <td className="px-3 py-2 text-xs">{getAssignment(event, 'vocal_2')}</td>
                    <td className="px-3 py-2 text-xs">{getAssignment(event, 'vocal_3')}</td>
                    <td className="px-3 py-2 text-xs">{getAssignment(event, 'bateria')}</td>
                    <td className="px-3 py-2 text-xs">{getAssignment(event, 'guitarra')}</td>
                    <td className="px-3 py-2 text-xs">{getAssignment(event, 'baixo')}</td>
                    <td className="px-3 py-2 text-xs">{getAssignment(event, 'teclado')}</td>
                    <td className="px-3 py-2 text-xs">{getAssignment(event, 'back')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick menu */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/admin/membros" className="card flex flex-col items-center gap-1.5 py-3 hover:border-[#444]">
          <Users className="w-5 h-5" />
          <span className="text-xs font-medium">Membros</span>
        </Link>
        <Link href="/admin/musicas" className="card flex flex-col items-center gap-1.5 py-3 hover:border-[#444]">
          <Music className="w-5 h-5" />
          <span className="text-xs font-medium">Músicas</span>
        </Link>
        <Link href="/admin/config" className="card flex flex-col items-center gap-1.5 py-3 hover:border-[#444]">
          <Settings className="w-5 h-5" />
          <span className="text-xs font-medium">Config</span>
        </Link>
      </div>
    </div>
  )
}
