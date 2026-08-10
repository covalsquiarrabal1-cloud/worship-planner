'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, Search, User } from 'lucide-react'
import Link from 'next/link'

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

interface Member {
  id: string
  name: string
}

const roleLabels: Record<string, string> = {
  vocal_1: 'Vocal 1', vocal_2: 'Vocal 2', vocal_3: 'Vocal 3',
  guitarra: 'Guitarra', baixo: 'Baixo', bateria: 'Bateria', teclado: 'Teclado', back: 'Back',
}

const vocalRoles = ['vocal_1', 'vocal_2', 'vocal_3']
const instrumentRoles = ['bateria', 'guitarra', 'baixo', 'teclado']

export default function EscalaMembroPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    if (selectedMember) loadEvents()
  }, [currentDate, selectedMember])

  async function loadMembers() {
    const res = await fetch('/api/members')
    if (res.ok) {
      const data = await res.json()
      setMembers(Array.isArray(data) ? data.filter((m: any) => !m.is_blocked).sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR')) : [])
    }
    setLoading(false)
  }

  async function loadEvents() {
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
    const res = await fetch(`/api/schedule-events?start=${start}&end=${end}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setEvents(Array.isArray(data) ? data : [])
    }
  }

  // Filter events where selected member is assigned
  const memberName = members.find(m => m.id === selectedMember)?.name || ''
  const memberEvents = events.filter(e =>
    e.assignments.some(a => a.member?.id === selectedMember)
  )

  // Filter member list by search
  const filteredMembers = search.trim()
    ? members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : members

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/config/louvor" className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-lg font-bold">Escala por Membro</h2>
          <p className="text-xs text-[var(--muted-foreground)]">Visualize a escala como o membro vê</p>
        </div>
      </div>

      {/* Member selector */}
      <div className="card space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Buscar membro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10"
          />
        </div>

        {!selectedMember ? (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filteredMembers.map(m => (
              <button
                key={m.id}
                onClick={() => { setSelectedMember(m.id); setSearch('') }}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--accent)] transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4 text-[var(--muted-foreground)]" />
                <span className="text-sm">{m.name}</span>
              </button>
            ))}
            {filteredMembers.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-4">Nenhum membro encontrado.</p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">{memberName}</span>
            </div>
            <button
              onClick={() => setSelectedMember('')}
              className="text-xs text-[#58a6ff] hover:underline"
            >
              Trocar
            </button>
          </div>
        )}
      </div>

      {/* Month navigation (only shown when member is selected) */}
      {selectedMember && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Results */}
          {memberEvents.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-sm text-[var(--muted-foreground)]">
                {memberName} não está escalado(a) neste mês.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--muted-foreground)]">{memberEvents.length} dia(s) escalado(a)</p>

              {memberEvents.map(event => {
                const myRole = event.assignments.find(a => a.member?.id === selectedMember)?.role || ''
                const vocals = event.assignments.filter(a => vocalRoles.includes(a.role)).sort((a, b) => a.role.localeCompare(b.role))
                const instruments = event.assignments.filter(a => instrumentRoles.includes(a.role))
                const songs = [...(event.songs || [])].sort((a, b) => a.order_num - b.order_num)

                return (
                  <div key={event.id} className="card relative space-y-3">
                    <div className="absolute inset-0 rounded-2xl border-flow-card" style={{ '--flow-color': '#22c55e' } as React.CSSProperties} />
                    <div className="relative space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 text-center min-w-[50px]">
                          <p className="text-lg font-bold">{format(new Date(event.event_date + 'T12:00:00'), 'dd')}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)] capitalize">{event.day_of_week}</p>
                        </div>
                        <div className="flex-1 border-l border-[var(--border)] pl-3">
                          <p className="font-bold text-green-400">{event.scale_type?.name || '-'}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">🎵 {roleLabels[myRole] || myRole}</p>
                        </div>
                      </div>

                      {/* Vocais */}
                      {vocals.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {vocals.map(a => (
                            <span key={a.id} className={`text-xs px-2 py-1 rounded-lg ${a.member?.id === selectedMember ? 'bg-green-500/20 text-green-400 font-bold' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}>
                              🎤 {roleLabels[a.role]} {a.member?.name || '-'}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Louvores */}
                      {songs.length > 0 && (
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
                            {songs.map(song => (
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
                      )}

                      {/* Músicos */}
                      {instruments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border)]">
                          {instruments.map(a => {
                            const icon = a.role === 'guitarra' ? '🎸' : a.role === 'baixo' ? '🎸' : a.role === 'bateria' ? '🥁' : '🎹'
                            return (
                              <span key={a.id} className={`text-xs px-2 py-1 rounded-lg ${a.member?.id === selectedMember ? 'bg-green-500/20 text-green-400 font-bold' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}>
                                {icon} {roleLabels[a.role]} {a.member?.name || '-'}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
