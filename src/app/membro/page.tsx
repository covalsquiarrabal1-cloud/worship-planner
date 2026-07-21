'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { playClick } from '@/lib/sounds'

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
          onClick={() => { playClick(); setView('mensal') }}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'mensal' ? 'bg-white text-black' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}
        >
          Mensal
        </button>
        <button
          onClick={() => { playClick(); setView('semanal') }}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'semanal' ? 'bg-white text-black' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}
        >
          Semanal
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

                {/* Louvores first */}
                {event.songs && event.songs.length > 0 && (
                  <div className="mb-3">
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
                        {[...event.songs].sort((a, b) => a.order_num - b.order_num).map(song => (
                          <tr key={song.id} className="border-b border-[var(--border)]/30">
                            <td className="py-2 px-1 text-center font-bold">{song.order_num}</td>
                            <td className={`py-2 px-1 font-medium ${song.minister && isMe(song.minister.split(' / ').find(n => isMe(n)) || '') ? 'text-green-300' : ''}`}>{song.title}</td>
                            <td className="py-2 px-1 text-[var(--muted-foreground)]">{song.version || '-'}</td>
                            <td className={`py-2 px-1 ${song.minister && song.minister.toUpperCase().includes(memberName.toUpperCase()) ? 'text-green-300 font-bold' : ''}`}>{song.minister || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Músicos at bottom */}
                <div className="border-t border-[var(--border)] pt-2">
                  <div className="grid grid-cols-2 gap-1">
                    {instruments.map((a, idx) => (
                      <div key={idx} className={`text-xs py-0.5 ${isMe(a.member?.name) ? 'text-green-300 font-bold' : ''}`}>
                        <span className="text-[var(--muted-foreground)]">{roleLabels[a.role] || a.role}: </span>
                        <span className="font-bold">{a.member?.name || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
