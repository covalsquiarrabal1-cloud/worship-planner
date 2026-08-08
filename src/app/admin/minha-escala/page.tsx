'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'

interface ScheduleEvent {
  id: string
  event_date: string
  day_of_week: string
  scale_type: { id: string; name: string } | null
  assignments: {
    id: string
    role: string
    member: { id: string; name: string } | null
  }[]
  songs: {
    id: string
    order_num: number
    title: string
    version: string | null
    minister: string | null
    youtube_url: string | null
  }[]
}

interface MyDay {
  date: string
  dayOfWeek: string
  scaleName: string
  role: string
  type: 'louvor' | 'ministerio'
  ministryName?: string
  eventId?: string
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

const vocalRoles = ['vocal_1', 'vocal_2', 'vocal_3']
const instrumentRoles = ['bateria', 'guitarra', 'baixo', 'teclado']

export default function MinhaEscalaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [days, setDays] = useState<MyDay[]>([])
  const [allEvents, setAllEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [memberName, setMemberName] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadMySchedule()
  }, [currentDate])

  async function loadMySchedule() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Get member name
    const { data: member } = await supabase
      .from('members')
      .select('name')
      .eq('email', user.email)
      .single()

    const name = member?.name || ''
    setMemberName(name)

    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const unified: MyDay[] = []

    // Fetch worship schedule
    const worshipRes = await fetch(`/api/schedule-events?start=${start}&end=${end}`)
    if (worshipRes.ok && name) {
      const events: ScheduleEvent[] = await worshipRes.json()
      setAllEvents(events)
      for (const event of events) {
        for (const assignment of event.assignments) {
          if (assignment.member?.name?.toUpperCase() === name.toUpperCase()) {
            unified.push({
              date: event.event_date,
              dayOfWeek: event.day_of_week,
              scaleName: event.scale_type?.name || '-',
              role: assignment.role,
              type: 'louvor',
              eventId: event.id,
            })
            break
          }
        }
      }
    }

    // Fetch ministry schedule
    const ministryRes = await fetch(`/api/minha-escala-ministerio?start=${start}&end=${end}`)
    if (ministryRes.ok) {
      const ministryEvents = await ministryRes.json()
      for (const mEvent of ministryEvents) {
        unified.push({
          date: mEvent.event_date,
          dayOfWeek: mEvent.day_of_week,
          scaleName: mEvent.scale_name || '-',
          role: mEvent.ministry_name,
          type: 'ministerio',
          ministryName: mEvent.ministry_name,
        })
      }
    }

    unified.sort((a, b) => a.date.localeCompare(b.date))
    setDays(unified)
    setLoading(false)
  }

  function openEventDetail(day: MyDay) {
    if (day.type !== 'louvor' || !day.eventId) return
    const event = allEvents.find(e => e.id === day.eventId)
    if (event) setSelectedEvent(event)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link href="/admin" className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)]">
          Escalas
        </Link>
        <Link href="/admin/membros" className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)]">
          Membros
        </Link>
        <Link href="/admin/musicas" className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)]">
          Músicas
        </Link>
        <Link href="/admin/minha-escala" className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#58a6ff] text-white shadow-[0_2px_8px_rgba(88,166,255,0.3)]">
          Minha Escala
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold">Minha Escala</h2>
          {memberName && (
            <p className="text-sm text-[var(--muted-foreground)]">Dias em que você está escalado(a)</p>
          )}
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold capitalize">
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
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : days.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarDays className="w-8 h-8 mx-auto mb-3 text-[var(--muted-foreground)] opacity-50" />
          <p className="text-sm text-[var(--muted-foreground)]">Nenhuma escala encontrada para este mês.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[var(--muted-foreground)]">{days.length} dia(s) escalado(a)</p>
          {days.map((day, idx) => {
            const dateObj = new Date(day.date + 'T12:00:00')
            return (
              <div
                key={idx}
                className={`card relative flex items-center gap-4 ${day.type === 'louvor' ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
                onClick={() => openEventDetail(day)}
              >
                <div className="absolute inset-0 rounded-2xl border-flow-card" style={{ '--flow-color': day.type === 'louvor' ? '#22c55e' : '#58a6ff' } as React.CSSProperties} />
                <div className="relative flex items-center gap-4 w-full">
                {/* Date */}
                <div className="shrink-0 text-center min-w-[50px]">
                  <p className="text-lg font-bold">{format(dateObj, 'dd')}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] capitalize">{day.dayOfWeek}</p>
                </div>

                {/* Details */}
                <div className="flex-1 border-l border-[var(--border)] pl-4">
                  <p className="text-sm font-semibold text-[#58a6ff]">{day.scaleName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {day.type === 'louvor'
                      ? `🎵 Louvor · ${roleLabels[day.role] || day.role}`
                      : `⛪ ${day.ministryName}`
                    }
                  </p>
                </div>

                {day.type === 'louvor' && (
                  <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] rounded-2xl overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--muted-foreground)] capitalize">
                  {selectedEvent.day_of_week}, {format(new Date(selectedEvent.event_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <h3 className="text-lg font-bold text-green-400">{selectedEvent.scale_type?.name || '-'}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-lg hover:bg-[var(--accent)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 overflow-y-auto max-h-[65vh] space-y-5">
              {/* Vocais */}
              {(() => {
                const vocals = selectedEvent.assignments
                  .filter(a => vocalRoles.includes(a.role))
                  .sort((a, b) => a.role.localeCompare(b.role))
                return vocals.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Vocais</h4>
                    <div className="flex flex-wrap gap-2">
                      {vocals.map(a => (
                        <span key={a.id} className="badge-vocal">
                          🎤 {roleLabels[a.role]} {a.member?.name || '-'}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Louvores */}
              {selectedEvent.songs && selectedEvent.songs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Louvores</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-1.5 px-1 text-[var(--muted-foreground)] font-semibold w-8">#</th>
                        <th className="text-left py-1.5 px-1 text-[var(--muted-foreground)] font-semibold">Louvor</th>
                        <th className="text-left py-1.5 px-1 text-[var(--muted-foreground)] font-semibold">Versão</th>
                        <th className="text-left py-1.5 px-1 text-[var(--muted-foreground)] font-semibold">Ministro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedEvent.songs].sort((a, b) => a.order_num - b.order_num).map(song => (
                        <tr key={song.id} className="border-b border-[var(--border)]/30">
                          <td className="py-2 px-1 text-center font-bold">{song.order_num}</td>
                          <td className="py-2 px-1 font-medium">{song.title}</td>
                          <td className="py-2 px-1 text-[var(--muted-foreground)]">{song.version || '-'}</td>
                          <td className={`py-2 px-1 ${song.minister && memberName && song.minister.toUpperCase().includes(memberName.toUpperCase()) ? 'text-green-400 font-bold' : ''}`}>
                            {song.minister || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Músicos */}
              {(() => {
                const instruments = selectedEvent.assignments
                  .filter(a => instrumentRoles.includes(a.role) || (!vocalRoles.includes(a.role) && !instrumentRoles.includes(a.role)))
                  .sort((a, b) => {
                    const order = instrumentRoles
                    const aIdx = order.indexOf(a.role)
                    const bIdx = order.indexOf(b.role)
                    if (aIdx === -1 && bIdx === -1) return a.role.localeCompare(b.role)
                    if (aIdx === -1) return 1
                    if (bIdx === -1) return -1
                    return aIdx - bIdx
                  })
                return instruments.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Músicos</h4>
                    <div className="flex flex-wrap gap-2">
                      {instruments.map(a => {
                        const badgeClass = a.role === 'guitarra' ? 'badge-guitar' : a.role === 'baixo' ? 'badge-bass' : a.role === 'bateria' ? 'badge-drums' : 'badge-keys'
                        const icon = a.role === 'guitarra' ? '🎸' : a.role === 'baixo' ? '🎸' : a.role === 'bateria' ? '🥁' : '🎹'
                        return (
                          <span key={a.id} className={badgeClass}>
                            {icon} {roleLabels[a.role] || a.role} {a.member?.name || '-'}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Empty state */}
              {selectedEvent.songs.length === 0 && selectedEvent.assignments.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                  Nenhum detalhe disponível para este evento.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
