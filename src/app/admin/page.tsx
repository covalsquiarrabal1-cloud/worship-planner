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
  songs: {
    id: string
    order_num: number
    title: string
    version: string | null
    minister: string | null
    youtube_url: string | null
  }[]
}

export default function AdminPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'mensal' | 'semanal' | 'pessoa'>('mensal')
  const [currentWeek, setCurrentWeek] = useState(1)
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [editingCell, setEditingCell] = useState<{ eventId: string; assignmentId: string; role: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => {
    loadEvents()
    loadMembers()
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

    const res = await fetch(`/api/schedule-events?start=${start}&end=${end}`)
    if (res.ok) {
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : [])
    } else {
      setEvents([])
    }
    setLoading(false)
  }

  async function loadMembers() {
    const res = await fetch('/api/members')
    if (res.ok) {
      const data = await res.json()
      setMembers(Array.isArray(data) ? data.map((m: any) => ({ id: m.id, name: m.name })) : [])
    }
  }

  async function updateAssignment(assignmentId: string, memberId: string) {
    await fetch('/api/schedule-events/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignment_id: assignmentId, member_id: memberId }),
    })
    setEditingCell(null)
    loadEvents()
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

  function getAssignmentData(event: ScheduleEvent, role: string): { id: string; name: string; memberId: string } | null {
    const a = event.assignments.find(a => a.role === role)
    if (!a) return null
    return { id: a.id, name: a.member?.name || '-', memberId: a.member?.id || '' }
  }

  function renderEditableCell(event: ScheduleEvent, role: string) {
    const data = getAssignmentData(event, role)
    if (!data) return <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">-</td>

    const isEditing = editingCell?.eventId === event.id && editingCell?.role === role

    if (isEditing) {
      return (
        <td className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
          <select
            autoFocus
            defaultValue={data.memberId}
            onChange={(e) => updateAssignment(data.id, e.target.value)}
            onBlur={() => setEditingCell(null)}
            className="!py-1 !px-1 text-xs w-full"
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </td>
      )
    }

    return (
      <td
        className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-500/10 rounded"
        onClick={(e) => { e.stopPropagation(); setEditingCell({ eventId: event.id, assignmentId: data.id, role }) }}
      >
        {data.name}
      </td>
    )
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

      {/* === VIEW TOGGLE === */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setView('mensal')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'mensal' ? 'bg-white text-black' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}
        >
          Visão Mensal
        </button>
        <button
          onClick={() => setView('semanal')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'semanal' ? 'bg-white text-black' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}
        >
          Visão Semanal
        </button>
        <button
          onClick={() => setView('pessoa')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'pessoa' ? 'bg-white text-black' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}
        >
          Visão por Pessoa
        </button>
        {view === 'semanal' && (
          <div className="flex items-center gap-2 ml-4">
            <button onClick={() => setCurrentWeek(w => Math.max(1, w - 1))} className="p-1 rounded bg-[var(--accent)]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">Semana {currentWeek}</span>
            <button onClick={() => setCurrentWeek(w => w + 1)} className="p-1 rounded bg-[var(--accent)]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
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
      ) : view === 'pessoa' ? (
        <PersonView events={events} />
      ) : view === 'semanal' ? (
        <WeeklyView
          events={events.filter(e => e.week_number === currentWeek)}
          members={members}
          onUpdateAssignment={updateAssignment}
        />
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
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx, arr) => {
                const prevEvent = idx > 0 ? arr[idx - 1] : null
                const showWeekSeparator = prevEvent && prevEvent.week_number !== event.week_number

                return (
                  <tr
                    key={event.id}
                    className={`border-b border-[var(--border)] hover:bg-[var(--accent)]/50 ${showWeekSeparator ? 'border-t-2 border-t-[var(--muted-foreground)]/30' : ''}`}
                  >
                    <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">{event.week_number}</td>
                    <td className="px-3 py-2 text-xs font-medium">{format(new Date(event.event_date + 'T12:00:00'), 'dd/MM')}</td>
                    <td className="px-3 py-2 text-xs capitalize">{event.day_of_week}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-green-400">{event.scale_type?.name || '-'}</td>
                    {renderEditableCell(event, 'vocal_1')}
                    {renderEditableCell(event, 'vocal_2')}
                    {renderEditableCell(event, 'vocal_3')}
                    {renderEditableCell(event, 'bateria')}
                    {renderEditableCell(event, 'guitarra')}
                    {renderEditableCell(event, 'baixo')}
                    {renderEditableCell(event, 'teclado')}
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


function PersonView({ events }: { events: ScheduleEvent[] }) {
  // Day of week mapping from day_of_week string to index
  const dayMap: Record<string, number> = {
    'domingo': 0,
    'segunda': 1,
    'terça': 2,
    'quarta': 3,
    'quinta': 4,
    'sexta-feira': 5,
    'sexta': 5,
    'sábado': 6,
  }

  const dayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']
  // Map: dayLabels index -> day_of_week number (1=seg, 2=ter, ..., 6=sab, 0=dom)
  const dayLabelToNum = [1, 2, 3, 4, 5, 6, 0]

  // Build person stats
  const personStats: Record<string, { name: string; days: number[] }> = {}

  for (const event of events) {
    const dow = dayMap[event.day_of_week.toLowerCase()] ?? -1
    if (dow === -1) continue

    for (const assignment of event.assignments) {
      const name = assignment.member?.name
      if (!name) continue

      if (!personStats[name]) {
        personStats[name] = { name, days: [0, 0, 0, 0, 0, 0, 0] } // indices 0-6 = dom-sab
      }
      personStats[name].days[dow]++
    }
  }

  // Convert to array sorted by name
  const rows = Object.values(personStats).sort((a, b) => a.name.localeCompare(b.name))

  if (rows.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-[var(--muted-foreground)]">Nenhum dado disponível.</p>
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Nome</th>
            {dayLabels.map((label) => (
              <th key={label} className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">{label}</th>
            ))}
            <th className="text-center px-3 py-2.5 text-xs font-semibold text-white">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = row.days.reduce((sum, v) => sum + v, 0)
            return (
              <tr key={row.name} className="border-b border-[var(--border)] hover:bg-[var(--accent)]/50">
                <td className="px-3 py-2 text-xs font-medium">{row.name}</td>
                {dayLabelToNum.map((dowNum, idx) => (
                  <td key={idx} className="text-center px-3 py-2 text-xs">
                    {row.days[dowNum] > 0 ? row.days[dowNum] : ''}
                  </td>
                ))}
                <td className="text-center px-3 py-2 text-xs font-bold">{total}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}


function WeeklyView({ events, members, onUpdateAssignment }: {
  events: ScheduleEvent[]
  members: { id: string; name: string }[]
  onUpdateAssignment: (assignmentId: string, memberId: string) => void
}) {
  if (events.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-[var(--muted-foreground)]">Nenhum evento nesta semana.</p>
      </div>
    )
  }

  const vocalRoles = ['vocal_1', 'vocal_2', 'vocal_3']
  const instrumentRoles = ['bateria', 'guitarra', 'baixo', 'teclado']
  const roleLabels: Record<string, string> = {
    vocal_1: 'Vocal 1', vocal_2: 'Vocal 2', vocal_3: 'Vocal 3',
    bateria: 'Bateria', guitarra: 'Guitarra', baixo: 'Baixo', teclado: 'Teclado',
  }

  return (
    <div className="space-y-6">
      {events.map((event) => {
        const vocals = event.assignments.filter(a => vocalRoles.includes(a.role)).sort((a, b) => a.role.localeCompare(b.role))
        const instruments = event.assignments.filter(a => instrumentRoles.includes(a.role))
        const songs = (event.songs || []).sort((a, b) => a.order_num - b.order_num)

        return (
          <div key={event.id} className="card space-y-4">
            {/* Header */}
            <div>
              <span className="text-xs text-[var(--muted-foreground)] capitalize">
                {event.day_of_week}, {event.event_date.slice(8, 10)}/{event.event_date.slice(5, 7)}
              </span>
              <h3 className="text-lg font-bold text-green-400">{event.scale_type?.name || '-'}</h3>
            </div>

            {/* Escala: Vocais + Músicos side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] mb-1">Vocais</p>
                {vocals.map(a => (
                  <div key={a.id} className="text-xs py-1">
                    <span className="text-[var(--muted-foreground)]">{roleLabels[a.role]}: </span>
                    <span className="font-medium">{a.member?.name || '-'}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] mb-1">Músicos</p>
                {instruments.map(a => (
                  <div key={a.id} className="text-xs py-1">
                    <span className="text-[var(--muted-foreground)]">{roleLabels[a.role] || a.role}: </span>
                    <span className="font-medium">{a.member?.name || '-'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Louvores */}
            {songs.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] mb-2">Louvores</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-1.5 px-2 text-[var(--muted-foreground)] font-medium w-8">#</th>
                      <th className="text-left py-1.5 px-2 text-[var(--muted-foreground)] font-medium">Louvor</th>
                      <th className="text-left py-1.5 px-2 text-[var(--muted-foreground)] font-medium">Versão</th>
                      <th className="text-left py-1.5 px-2 text-[var(--muted-foreground)] font-medium">Ministro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map(song => (
                      <tr key={song.id} className="border-b border-[var(--border)]/50">
                        <td className="py-2 px-2 text-[var(--muted-foreground)]">{song.order_num}</td>
                        <td className="py-2 px-2 font-medium">{song.title}</td>
                        <td className="py-2 px-2 text-[var(--muted-foreground)]">{song.version || '-'}</td>
                        <td className="py-2 px-2">{song.minister || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
