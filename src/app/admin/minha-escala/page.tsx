'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, ArrowLeft } from 'lucide-react'
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
}

interface MyDay {
  date: string
  dayOfWeek: string
  scaleName: string
  role: string
  type: 'louvor' | 'ministerio'
  ministryName?: string
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

export default function MinhaEscalaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [days, setDays] = useState<MyDay[]>([])
  const [loading, setLoading] = useState(true)
  const [memberName, setMemberName] = useState('')
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
      for (const event of events) {
        for (const assignment of event.assignments) {
          if (assignment.member?.name?.toUpperCase() === name.toUpperCase()) {
            unified.push({
              date: event.event_date,
              dayOfWeek: event.day_of_week,
              scaleName: event.scale_type?.name || '-',
              role: assignment.role,
              type: 'louvor',
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
              <div key={idx} className="card relative flex items-center gap-4">
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
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
