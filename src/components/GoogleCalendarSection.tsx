'use client'

import { useState, useEffect } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Loader2,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  endDate: string
  location: string | null
  description: string | null
  allDay: boolean
}

export default function GoogleCalendarSection() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => {
    loadCalendarEvents()
  }, [month, year])

  async function loadCalendarEvents() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/google-calendar?month=${month}&year=${year}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erro ao carregar agenda')
        setEvents([])
      } else {
        const data = await res.json()
        setEvents(Array.isArray(data) ? data : [])
      }
    } catch {
      setError('Erro de conexão ao carregar agenda do Google')
      setEvents([])
    }

    setLoading(false)
  }

  function getEventsForDay(day: Date): CalendarEvent[] {
    const dayStr = format(day, 'yyyy-MM-dd')
    return events.filter((event) => {
      const eventDate = event.allDay
        ? event.date
        : event.date.substring(0, 10)
      return eventDate === dayStr
    })
  }

  function formatEventTime(dateStr: string, allDay: boolean): string {
    if (allDay) return 'Dia inteiro'
    try {
      const date = new Date(dateStr)
      return format(date, 'HH:mm')
    } catch {
      return ''
    }
  }

  // Calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Events for selected day
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="space-y-3" style={{ marginTop: '32px' }}>
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#4285f4]" />
          <h3 className="text-base font-bold">Agenda Google</h3>
        </div>
        <button
          onClick={loadCalendarEvents}
          disabled={loading}
          className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)] transition-colors disabled:opacity-40"
          title="Atualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setCurrentDate(subMonths(currentDate, 1)); setSelectedDay(null) }}
          className="p-2 rounded-lg bg-[var(--accent)] active:bg-[var(--border)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h4 className="text-sm font-semibold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h4>
        <button
          onClick={() => { setCurrentDate(addMonths(currentDate, 1)); setSelectedDay(null) }}
          className="p-2 rounded-lg bg-[var(--accent)] active:bg-[var(--border)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="card border-red-500/30 flex items-start gap-3 py-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">Não foi possível carregar a agenda</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      {loading ? (
        <div className="card flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : !error && (
        <div className="card p-3">
          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-[var(--muted-foreground)] py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const inMonth = isSameMonth(day, currentDate)
              const dayEvents = getEventsForDay(day)
              const hasEvents = dayEvents.length > 0
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const today = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    if (inMonth) setSelectedDay(isSelected ? null : day)
                  }}
                  disabled={!inMonth}
                  className={`
                    relative flex flex-col items-start rounded-lg p-1.5 min-h-[64px] text-xs transition-all overflow-hidden
                    ${!inMonth ? 'opacity-20 cursor-default' : 'cursor-pointer'}
                    ${isSelected ? 'bg-[#4285f4] text-white ring-2 ring-[#4285f4]' : ''}
                    ${!isSelected && today ? 'ring-1 ring-[#4285f4]/50' : ''}
                    ${!isSelected && hasEvents ? 'bg-[#4285f4]/10' : ''}
                    ${!isSelected && !hasEvents && inMonth ? 'hover:bg-[var(--accent)]' : ''}
                  `}
                >
                  <span className={`text-[11px] font-semibold ${isSelected ? 'text-white' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {hasEvents && (
                    <div className="flex flex-col gap-0.5 mt-0.5 w-full">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          key={event.id}
                          className={`text-[8px] leading-tight font-medium truncate w-full ${
                            isSelected ? 'text-white/90' : 'text-[#4285f4]'
                          }`}
                        >
                          {event.title}
                        </span>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className={`text-[8px] ${isSelected ? 'text-white/70' : 'text-[var(--muted-foreground)]'}`}>
                          +{dayEvents.length - 2} mais
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected day events */}
      {selectedDay && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
            </h4>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1.5 rounded-lg hover:bg-[var(--accent)]"
            >
              <X className="w-4 h-4 text-[var(--muted-foreground)]" />
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="card text-center py-4">
              <p className="text-xs text-[var(--muted-foreground)]">Nenhum evento neste dia.</p>
            </div>
          ) : (
            selectedDayEvents.map((event) => (
              <div key={event.id} className="card py-3 px-4">
                <h5 className="text-sm font-semibold">{event.title}</h5>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <Clock className="w-3 h-3" />
                    {formatEventTime(event.date, event.allDay)}
                    {!event.allDay && event.endDate && (
                      <> – {formatEventTime(event.endDate, false)}</>
                    )}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{event.location}</span>
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-2 line-clamp-3">
                    {event.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
