'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, getWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Calendar, Check, X } from 'lucide-react'

interface Member {
  id: string
  name: string
  gender: 'male' | 'female'
  is_leader: boolean
  is_back: boolean
  is_blocked: boolean
  is_musician: boolean
  instrument: string | null
}

interface ScaleType {
  id: string
  name: string
  type: 'normal' | 'strong_brothers' | 'empoderadas'
}

interface Block {
  member_id: string
  blocked_date: string
}

interface SelectedDay {
  date: string
  dayOfWeek: string
  scaleTypeId: string
}

export default function GerarEscalaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const [members, setMembers] = useState<Member[]>([])
  const [scaleTypes, setScaleTypes] = useState<ScaleType[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedDays, setSelectedDays] = useState<SelectedDay[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState<'select-days' | 'preview'>('select-days')
  const supabase = createClient()

  // Pre-selected dates from calendar
  const preSelectedDates = searchParams.get('dates')

  useEffect(() => {
    loadData()
  }, [])

  // Initialize selected days from URL param
  useEffect(() => {
    if (preSelectedDates && scaleTypes.length > 0) {
      const dates = preSelectedDates.split(',')
      const days: SelectedDay[] = dates.map((dateStr) => {
        const dateObj = new Date(dateStr + 'T12:00:00')
        const dayOfWeek = dayNames[getDay(dateObj)] || ''
        return {
          date: dateStr,
          dayOfWeek,
          scaleTypeId: scaleTypes[0]?.id || '',
        }
      })
      setSelectedDays(days)
    }
  }, [preSelectedDates, scaleTypes])

  async function loadData() {
    const [membersRes, scaleTypesRes, blocksRes] = await Promise.all([
      supabase.from('members').select('*').eq('is_blocked', false).order('name'),
      supabase.from('scale_types').select('*').order('name'),
      supabase.from('member_blocks').select('member_id, blocked_date'),
    ])
    setMembers(membersRes.data || [])
    setScaleTypes(scaleTypesRes.data || [])
    setBlocks(blocksRes.data || [])
    setLoading(false)
  }

  // Generate calendar days for the month
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(monthStart)
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Filter only Fri, Sat, Sun (5, 6, 0)
  const celebrationDays = allDays.filter(d => {
    const day = getDay(d)
    return day === 5 || day === 6 || day === 0 // Fri, Sat, Sun
  })

  const dayNames: Record<number, string> = {
    0: 'domingo',
    1: 'segunda',
    2: 'terça',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta-feira',
    6: 'sábado',
  }

  function toggleDay(dateStr: string, dayOfWeek: string) {
    setSelectedDays(prev => {
      const exists = prev.find(d => d.date === dateStr)
      if (exists) return prev.filter(d => d.date !== dateStr)
      return [...prev, { date: dateStr, dayOfWeek, scaleTypeId: scaleTypes[0]?.id || '' }]
    })
  }

  function setDayScaleType(dateStr: string, scaleTypeId: string) {
    setSelectedDays(prev =>
      prev.map(d => d.date === dateStr ? { ...d, scaleTypeId } : d)
    )
  }

  async function generateSchedule() {
    if (selectedDays.length === 0) return
    setGenerating(true)

    // Create or get the schedule for this month
    const { data: existingSchedule } = await supabase
      .from('schedules')
      .select('id')
      .eq('month', month)
      .eq('year', year)
      .single()

    let scheduleId: string

    if (existingSchedule) {
      scheduleId = existingSchedule.id
      // Delete existing events for this schedule
      await supabase.from('schedule_events').delete().eq('schedule_id', scheduleId)
    } else {
      const { data: newSchedule } = await supabase
        .from('schedules')
        .insert({ month, year })
        .select('id')
        .single()
      scheduleId = newSchedule!.id
    }

    // Separate members by gender and role
    const maleLeaders = members.filter(m => m.gender === 'male' && m.is_leader)
    const femaleLeaders = members.filter(m => m.gender === 'female' && m.is_leader)
    const maleMembers = members.filter(m => m.gender === 'male' && !m.is_leader && !m.is_musician)
    const femaleMembers = members.filter(m => m.gender === 'female' && !m.is_leader && !m.is_musician)
    const backs = members.filter(m => m.is_back)
    const guitarists = members.filter(m => m.is_musician && m.instrument === 'guitarra')
    const bassists = members.filter(m => m.is_musician && m.instrument === 'baixo')
    const drummers = members.filter(m => m.is_musician && m.instrument === 'bateria')
    const keyboardists = members.filter(m => m.is_musician && m.instrument === 'teclado')

    // Round-robin indexes
    let maleLeaderIdx = 0
    let femaleLeaderIdx = 0
    let maleIdx = 0
    let femaleIdx = 0
    let backIdx = 0
    let guitarIdx = 0
    let bassIdx = 0
    let drumIdx = 0

    // Sort selected days by date
    const sortedDays = [...selectedDays].sort((a, b) => a.date.localeCompare(b.date))

    // Track assignments to ensure everyone gets at least 1 sat and 1 sun
    const memberSatCount: Record<string, number> = {}
    const memberSunCount: Record<string, number> = {}

    for (const day of sortedDays) {
      const scaleType = scaleTypes.find(st => st.id === day.scaleTypeId)
      const dateObj = new Date(day.date + 'T12:00:00')
      const weekNum = Math.ceil(dateObj.getDate() / 7)

      // Check which members are blocked on this date
      const blockedOnDate = blocks
        .filter(b => b.blocked_date === day.date)
        .map(b => b.member_id)

      function getAvailable(list: Member[]) {
        return list.filter(m => !blockedOnDate.includes(m.id))
      }

      function getNext(list: Member[], idx: number): { member: Member | null; newIdx: number } {
        const available = getAvailable(list)
        if (available.length === 0) return { member: null, newIdx: idx }
        const member = available[idx % available.length]
        return { member, newIdx: idx + 1 }
      }

      // Create the event
      const { data: event } = await supabase
        .from('schedule_events')
        .insert({
          schedule_id: scheduleId,
          event_date: day.date,
          day_of_week: day.dayOfWeek,
          week_number: weekNum,
          scale_type_id: day.scaleTypeId,
        })
        .select('id')
        .single()

      if (!event) continue

      const assignments: { event_id: string; member_id: string; role: string }[] = []

      // Determine vocal composition based on scale type
      if (scaleType?.type === 'strong_brothers') {
        // 3 males
        const avMales = getAvailable([...maleLeaders, ...maleMembers])
        for (let i = 0; i < 3 && i < avMales.length; i++) {
          const idx = (maleLeaderIdx + i) % avMales.length
          assignments.push({ event_id: event.id, member_id: avMales[idx].id, role: `vocal_${i + 1}` })
        }
        maleLeaderIdx += 3
      } else if (scaleType?.type === 'empoderadas') {
        // 3 females
        const avFemales = getAvailable([...femaleLeaders, ...femaleMembers])
        for (let i = 0; i < 3 && i < avFemales.length; i++) {
          const idx = (femaleLeaderIdx + i) % avFemales.length
          assignments.push({ event_id: event.id, member_id: avFemales[idx].id, role: `vocal_${i + 1}` })
        }
        femaleLeaderIdx += 3
      } else {
        // Normal: 1 male leader + 2 females
        const ml = getNext(maleLeaders, maleLeaderIdx)
        if (ml.member) {
          assignments.push({ event_id: event.id, member_id: ml.member.id, role: 'vocal_1' })
          maleLeaderIdx = ml.newIdx
        }

        const avFemales = getAvailable([...femaleLeaders, ...femaleMembers])
        for (let i = 0; i < 2 && i < avFemales.length; i++) {
          const idx = (femaleIdx + i) % avFemales.length
          assignments.push({ event_id: event.id, member_id: avFemales[idx].id, role: `vocal_${i + 2}` })
        }
        femaleIdx += 2
      }

      // Musicians
      const gtr = getNext(guitarists, guitarIdx)
      if (gtr.member) {
        assignments.push({ event_id: event.id, member_id: gtr.member.id, role: 'guitarra' })
        guitarIdx = gtr.newIdx
      }

      const bss = getNext(bassists, bassIdx)
      if (bss.member) {
        assignments.push({ event_id: event.id, member_id: bss.member.id, role: 'baixo' })
        bassIdx = bss.newIdx
      }

      const drm = getNext(drummers, drumIdx)
      if (drm.member) {
        assignments.push({ event_id: event.id, member_id: drm.member.id, role: 'bateria' })
        drumIdx = drm.newIdx
      }

      // Insert all assignments
      if (assignments.length > 0) {
        await supabase.from('schedule_assignments').insert(assignments)
      }
    }

    setGenerating(false)
    router.push('/admin')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Gerar Escala</h2>
      <p className="text-sm text-[var(--muted-foreground)]">
        {format(monthStart, "MMMM 'de' yyyy", { locale: ptBR })} — Selecione os dias de celebração e o tipo de cada escala.
      </p>

      {scaleTypes.length === 0 && (
        <div className="card border-yellow-500/30 bg-yellow-500/5">
          <p className="text-sm text-yellow-400">
            ⚠️ Cadastre tipos de escala em Configurações antes de gerar.
          </p>
        </div>
      )}

      {/* Day selection */}
      <div className="space-y-2">
        {celebrationDays.map((d) => {
          const dateStr = format(d, 'yyyy-MM-dd')
          const dayOfWeek = dayNames[getDay(d)]
          const isSelected = selectedDays.some(sd => sd.date === dateStr)

          return (
            <div key={dateStr} className="card">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDay(dateStr, dayOfWeek)}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-white border-white' : 'border-[var(--border)]'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-black" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {format(d, 'dd/MM')}
                    </span>
                    <span className="text-sm text-[var(--muted-foreground)] capitalize">
                      {dayOfWeek}
                    </span>
                  </div>
                  {isSelected && (
                    <select
                      value={selectedDays.find(sd => sd.date === dateStr)?.scaleTypeId || ''}
                      onChange={(e) => setDayScaleType(dateStr, e.target.value)}
                      className="mt-2 text-sm py-1.5"
                    >
                      <option value="">Tipo de escala</option>
                      {scaleTypes.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Generate button */}
      <div className="sticky bottom-20 pt-4">
        <button
          onClick={generateSchedule}
          disabled={generating || selectedDays.length === 0}
          className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Calendar className="w-5 h-5" />
              Gerar Escala ({selectedDays.length} dias)
            </>
          )}
        </button>
      </div>
    </div>
  )
}
