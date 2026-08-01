'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Calendar, RefreshCw, MapPin, Clock, AlertCircle } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  endDate: string
  location: string | null
  description: string | null
  allDay: boolean
}

interface GoogleCalendarSectionProps {
  month: number
  year: number
}

export default function GoogleCalendarSection({ month, year }: GoogleCalendarSectionProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  function formatEventTime(dateStr: string, allDay: boolean): string {
    if (allDay) return 'Dia inteiro'
    try {
      const date = new Date(dateStr)
      return format(date, 'HH:mm')
    } catch {
      return ''
    }
  }

  function formatEventDate(dateStr: string, allDay: boolean): string {
    try {
      const date = allDay ? new Date(dateStr + 'T12:00:00') : new Date(dateStr)
      return format(date, 'dd/MM (EEE)', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-3" style={{ marginTop: '32px' }}>
      {/* Header */}
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

      {/* Content */}
      {loading ? (
        <div className="card flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : error ? (
        <div className="card border-red-500/30 flex items-start gap-3 py-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">Não foi possível carregar a agenda</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{error}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Verifique se a agenda foi compartilhada com a conta de serviço:
              <br />
              <code className="text-[10px] bg-[var(--accent)] px-1.5 py-0.5 rounded mt-1 inline-block">
                worship-calendar@worshio-planner.iam.gserviceaccount.com
              </code>
            </p>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="card text-center py-6">
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum evento na agenda para este mês.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="card py-3 px-4">
              <div className="flex items-start gap-3">
                {/* Date badge */}
                <div className="shrink-0 bg-[#4285f4]/10 text-[#4285f4] rounded-lg px-2.5 py-1.5 text-center min-w-[56px]">
                  <span className="text-xs font-semibold">
                    {formatEventDate(event.date, event.allDay)}
                  </span>
                </div>

                {/* Event details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate">{event.title}</h4>
                  <div className="flex flex-wrap gap-3 mt-1">
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
                        <span className="truncate max-w-[150px]">{event.location}</span>
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1.5 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
