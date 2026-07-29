'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, ChevronDown } from 'lucide-react'

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
  songs?: {
    id: string
    order_num: number
    title: string
    version: string | null
    minister: string | null
    youtube_url: string | null
  }[]
}

interface MinistryEvent {
  id: string
  event_date: string
  day_of_week: string
  scale_name: string | null
  num_celebrations: number
  ministry_name: string
  ministry_slug: string
  assignments: {
    id: string
    celebration_number: number
    member: { id: string; name: string } | null
  }[]
}

interface UnifiedDay {
  date: string
  dayOfWeek: string
  type: 'louvor' | 'ministerio'
  scaleName: string
  role: string
  ministryName?: string
  ministrySlug?: string
  // For louvor events (expandable details)
  event?: ScheduleEvent
}

const ministryIcons: Record<string, string> = {
  som: '🔊',
  iluminacao: '💡',
  projecao: '📽',
  backstage: '🎭',
}

export default function MeusDiasPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [allDays, setAllDays] = useState<UnifiedDay[]>([])
  const [loading, setLoading] = useState(true)
  const [memberName, setMemberName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadAllEvents()
  }, [currentDate])

  async function loadAllEvents() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Get member name from members table
    const { data: member } = await supabase
      .from('members')
      .select('name')
      .eq('email', user.email)
      .single()

    const name = member?.name || ''
    setMemberName(name)

    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    // Fetch both in parallel
    const [worshipRes, ministryRes] = await Promise.all([
      fetch(`/api/schedule-events?start=${start}&end=${end}`),
      fetch(`/api/minha-escala-ministerio?start=${start}&end=${end}`),
    ])

    const unified: UnifiedDay[] = []

    // 1. Worship schedule events
    if (worshipRes.ok && name) {
      const events: ScheduleEvent[] = await worshipRes.json()
      for (const event of events) {
        for (const assignment of event.assignments) {
          if (assignment.member?.name?.toUpperCase() === name.toUpperCase()) {
            unified.push({
              date: event.event_date,
              dayOfWeek: event.day_of_week,
              type: 'louvor',
              scaleName: event.scale_type?.name || '-',
              role: assignment.role,
              event,
            })
            break
          }
        }
      }
    }

    // 2. Ministry schedule events
    if (ministryRes.ok) {
      const ministryEvents: MinistryEvent[] = await ministryRes.json()
      for (const mEvent of ministryEvents) {
        unified.push({
          date: mEvent.event_date,
          dayOfWeek: mEvent.day_of_week,
          type: 'ministerio',
          scaleName: mEvent.scale_name || '-',
          role: mEvent.ministry_name,
          ministryName: mEvent.ministry_name,
          ministrySlug: mEvent.ministry_slug,
        })
      }
    }

    // Sort by date
    unified.sort((a, b) => a.date.localeCompare(b.date))
    setAllDays(unified)
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Meus Dias</h2>
      {memberName && (
        <p className="text-sm text-[var(--muted-foreground)]">
          Olá, {memberName}! Aqui estão todos os seus dias de escala.
        </p>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="p-2 rounded-lg bg-[var(--accent)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium capitalize">
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
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : allDays.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma escala encontrada para este mês.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allDays.map((item, idx) => (
            item.type === 'louvor' ? (
              <ExpandableWorshipDay key={`w-${idx}`} item={item} roleLabels={roleLabels} memberName={memberName} />
            ) : (
              <MinistryDayCard key={`m-${idx}`} item={item} />
            )
          ))}
          <div className="card bg-[var(--accent)] text-center">
            <p className="text-sm">
              <span className="font-semibold">{allDays.length}</span> escalação{allDays.length > 1 ? 'ões' : ''} este mês
            </p>
          </div>
        </div>
      )}

      {/* Bottom spacer for fixed nav */}
      <div className="h-24" />
    </div>
  )
}

function MinistryDayCard({ item }: { item: UnifiedDay }) {
  const icon = ministryIcons[item.ministrySlug || ''] || '🎭'

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-[var(--accent)] flex flex-col items-center justify-center shrink-0">
          <span className="text-lg font-bold">
            {format(new Date(item.date + 'T12:00:00'), 'dd')}
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)] capitalize">
            {item.dayOfWeek.slice(0, 3)}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-medium text-green-400">{item.scaleName}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{icon}</span>
            <span className="text-xs text-[#58a6ff] font-medium">{item.ministryName}</span>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff] font-medium shrink-0">
          Ministério
        </span>
      </div>
    </div>
  )
}

function ExpandableWorshipDay({ item, roleLabels, memberName }: {
  item: UnifiedDay
  roleLabels: Record<string, string>
  memberName: string
}) {
  const [expanded, setExpanded] = useState(false)

  const instrumentRoles = ['bateria', 'guitarra', 'baixo', 'teclado']
  const instruments = (item.event?.assignments || []).filter((a: any) => instrumentRoles.includes(a.role))
  const songs = (item.event?.songs || []).sort((a: any, b: any) => a.order_num - b.order_num)

  return (
    <div className="card cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-[var(--accent)] flex flex-col items-center justify-center shrink-0">
          <span className="text-lg font-bold">
            {format(new Date(item.date + 'T12:00:00'), 'dd')}
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)] capitalize">
            {item.dayOfWeek.slice(0, 3)}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-medium text-green-400">{item.scaleName}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)]">🎵 {roleLabels[item.role] || item.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-400 font-medium">
            Louvor
          </span>
          <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Louvores table */}
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
                {songs.map((song: any) => (
                  <tr key={song.id} className="border-b border-[var(--border)]/30">
                    <td className="py-2 px-1 text-center font-bold">{song.order_num}</td>
                    <td className="py-2 px-1 font-medium">{song.title}</td>
                    <td className="py-2 px-1 text-[var(--muted-foreground)]">{song.version || '-'}</td>
                    <td className={`py-2 px-1 ${song.minister && song.minister.toUpperCase().includes(memberName.toUpperCase()) ? 'text-green-400 font-bold' : ''}`}>{song.minister || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Músicos at bottom */}
          {instruments.length > 0 && (
            <div className="border-t border-[var(--border)] pt-2">
              <div className="grid grid-cols-2 gap-1">
                {instruments.map((a: any) => (
                  <div key={a.id} className={`text-xs py-0.5 ${a.member?.name?.toUpperCase() === memberName.toUpperCase() ? 'text-green-400 font-bold' : ''}`}>
                    <span className="text-[var(--muted-foreground)]">{roleLabels[a.role] || a.role}: </span>
                    <span className="font-bold">{a.member?.name || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
