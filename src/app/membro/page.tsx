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

export default function MemberSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [memberName, setMemberName] = useState('')
  const [view, setView] = useState<'mensal' | 'semanal'>('semanal')
  const [currentWeek, setCurrentWeek] = useState(1)
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

    const { data: member } = await supabase
      .from('members')
      .select('name')
      .eq('email', user.email)
      .single()

    if (member?.name) {
      setMemberName(member.name)
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (profile?.full_name) setMemberName(profile.full_name)
    }
  }

  async function loadEvents() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const res = await fetch(`/api/schedule-events?start=${start}&end=${end}`)
    if (res.ok) {
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : [])
    } else {
      setEvents([])
    }
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

  // Sort roles: vocals first, then instruments
  const vocalRoles = ['vocal_1', 'vocal_2', 'vocal_3']
  const instrumentRoles = ['bateria', 'guitarra', 'baixo', 'teclado']

  function sortedAssignments(assignments: ScheduleEvent['assignments']) {
    const vocals = assignments.filter(a => vocalRoles.includes(a.role)).sort((a, b) => a.role.localeCompare(b.role))
    const instruments = assignments.filter(a => instrumentRoles.includes(a.role)).sort((a, b) => {
      const order = instrumentRoles
      return order.indexOf(a.role) - order.indexOf(b.role)
    })
    const others = assignments.filter(a => !vocalRoles.includes(a.role) && !instrumentRoles.includes(a.role))
    return { vocals, instruments: [...instruments, ...others] }
  }

  function isMe(name: string | undefined): boolean {
    if (!name || !memberName) return false
    return name.toUpperCase() === memberName.toUpperCase()
  }

  const groupedByWeek = events.reduce((acc, event) => {
    const week = event.week_number
    if (!acc[week]) acc[week] = []
    acc[week].push(event)
    return acc
  }, {} as Record<number, ScheduleEvent[]>)

  const weeks = Object.keys(groupedByWeek).map(Number).sort((a, b) => a - b)

  const displayedEvents = view === 'semanal'
    ? groupedByWeek[currentWeek] || []
    : events

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

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('semanal')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'semanal' ? 'bg-white text-black' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}
        >
          Semanal
        </button>
        <button
          onClick={() => setView('mensal')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'mensal' ? 'bg-white text-black' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}
        >
          Mensal
        </button>
        {view === 'semanal' && weeks.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setCurrentWeek(w => Math.max(1, w - 1))} className="p-1.5 rounded bg-[var(--accent)]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium">Sem {currentWeek}</span>
            <button onClick={() => setCurrentWeek(w => w + 1)} className="p-1.5 rounded bg-[var(--accent)]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
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
      ) : displayedEvents.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <p>Nenhum evento na semana {currentWeek}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedEvents.map((event) => {
            const { vocals, instruments } = sortedAssignments(event.assignments)
            const imOnThisDay = event.assignments.some(a => isMe(a.member?.name))

            return (
              <div key={event.id} className={`card ${imOnThisDay ? 'border-green-500/40' : ''}`}>
                <div className="mb-3">
                  <span className="text-xs text-[var(--muted-foreground)] capitalize">
                    {event.day_of_week}, {format(new Date(event.event_date + 'T12:00:00'), 'dd/MM')}
                  </span>
                  <h4 className="font-bold text-green-400">{event.scale_type?.name || '-'}</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Vocais - Left */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase mb-1">Vocais</p>
                    {vocals.map((a, idx) => (
                      <div key={idx} className={`text-xs px-2 py-1.5 rounded ${isMe(a.member?.name) ? 'bg-green-500/20 text-green-300 font-bold' : 'bg-[var(--accent)]'}`}>
                        <span className="text-[var(--muted-foreground)]">{roleLabels[a.role]}: </span>
                        <span className={isMe(a.member?.name) ? 'text-green-300' : ''}>{a.member?.name || '-'}</span>
                      </div>
                    ))}
                    {vocals.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">-</p>}
                  </div>

                  {/* Músicos - Right */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase mb-1">Músicos</p>
                    {instruments.map((a, idx) => (
                      <div key={idx} className={`text-xs px-2 py-1.5 rounded ${isMe(a.member?.name) ? 'bg-green-500/20 text-green-300 font-bold' : 'bg-[var(--accent)]'}`}>
                        <span className="text-[var(--muted-foreground)]">{roleLabels[a.role] || a.role}: </span>
                        <span className={isMe(a.member?.name) ? 'text-green-300' : ''}>{a.member?.name || '-'}</span>
                      </div>
                    ))}
                    {instruments.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">-</p>}
                  </div>
                </div>

                {/* Louvores */}
                {event.songs && event.songs.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--border)]">
                    <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase mb-2">Louvores</p>
                    <div className="space-y-1.5">
                      {[...event.songs].sort((a, b) => a.order_num - b.order_num).map(song => (
                        <div key={song.id} className="flex items-center gap-2 text-xs bg-[var(--accent)] rounded px-2 py-2">
                          <span className="text-[var(--muted-foreground)] w-4 shrink-0">{song.order_num}.</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{song.title}</span>
                            {song.minister && <span className="text-[var(--muted-foreground)]"> — {song.minister}</span>}
                          </div>
                          {song.youtube_url && (
                            <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" className="text-red-400 shrink-0">▶</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom spacer for fixed nav */}
      <div className="h-24" />
    </div>
  )
}
