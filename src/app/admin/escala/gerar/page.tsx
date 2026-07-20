'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { format, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Calendar, ArrowLeft, X, Plus } from 'lucide-react'
import Link from 'next/link'

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

interface Block {
  member_id: string
  blocked_date: string
}

interface SelectedDay {
  date: string
  dayOfWeek: string
  scaleName: string
}

const dayNames: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta-Feira',
  6: 'Sábado',
}

export default function GerarEscalaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const preSelectedDates = searchParams.get('dates')

  const [members, setMembers] = useState<Member[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedDays, setSelectedDays] = useState<SelectedDay[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [quickNames, setQuickNames] = useState<string[]>([])
  const [newQuickName, setNewQuickName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [membersRes, blocksRes, scaleTypesRes] = await Promise.all([
      supabase.from('members').select('*').eq('is_blocked', false).order('name'),
      supabase.from('member_blocks').select('member_id, blocked_date'),
      supabase.from('scale_types').select('name').order('name'),
    ])
    setMembers(membersRes.data || [])
    setBlocks(blocksRes.data || [])

    // Load existing scale type names as quick-select options
    const existingNames = (scaleTypesRes.data || []).map(st => st.name)
    setQuickNames(existingNames)

    // Initialize days from URL params
    if (preSelectedDates) {
      const dates = preSelectedDates.split(',')
      const days: SelectedDay[] = dates.map((dateStr) => {
        const dateObj = new Date(dateStr + 'T12:00:00')
        const dayOfWeek = dayNames[getDay(dateObj)] || ''
        return { date: dateStr, dayOfWeek, scaleName: '' }
      })
      setSelectedDays(days.sort((a, b) => a.date.localeCompare(b.date)))
    }

    setLoading(false)
  }

  function setDayScaleName(dateStr: string, scaleName: string) {
    setSelectedDays(prev =>
      prev.map(d => d.date === dateStr ? { ...d, scaleName } : d)
    )
  }

  function applyNameToAll(name: string) {
    setSelectedDays(prev => prev.map(d => ({ ...d, scaleName: name })))
  }

  function removeDay(dateStr: string) {
    setSelectedDays(prev => prev.filter(d => d.date !== dateStr))
  }

  function addQuickName() {
    if (newQuickName.trim() && !quickNames.includes(newQuickName.trim())) {
      setQuickNames(prev => [...prev, newQuickName.trim()])
      // Also save to database
      supabase.from('scale_types').insert({ name: newQuickName.trim(), type: 'normal' })
      setNewQuickName('')
    }
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
      await supabase.from('schedule_events').delete().eq('schedule_id', scheduleId)
    } else {
      const { data: newSchedule } = await supabase
        .from('schedules')
        .insert({ month, year })
        .select('id')
        .single()
      scheduleId = newSchedule!.id
    }

    // Get or create scale types for each unique name
    const uniqueNames = [...new Set(selectedDays.map(d => d.scaleName).filter(Boolean))]
    const scaleTypeMap: Record<string, string> = {}

    for (const name of uniqueNames) {
      const { data: existing } = await supabase
        .from('scale_types')
        .select('id')
        .eq('name', name)
        .single()

      if (existing) {
        scaleTypeMap[name] = existing.id
      } else {
        const { data: created } = await supabase
          .from('scale_types')
          .insert({ name, type: 'normal' })
          .select('id')
          .single()
        if (created) scaleTypeMap[name] = created.id
      }
    }

    // Separate members by role
    const maleLeaders = members.filter(m => m.gender === 'male' && m.is_leader)
    const femaleLeaders = members.filter(m => m.gender === 'female' && m.is_leader)
    const femaleMembers = members.filter(m => m.gender === 'female' && !m.is_leader && !m.is_musician)
    const maleMembers = members.filter(m => m.gender === 'male' && !m.is_leader && !m.is_musician)
    const guitarists = members.filter(m => m.is_musician && m.instrument === 'guitarra')
    const bassists = members.filter(m => m.is_musician && m.instrument === 'baixo')
    const drummers = members.filter(m => m.is_musician && m.instrument === 'bateria')
    const keyboardists = members.filter(m => m.is_musician && m.instrument === 'teclado')

    let maleLeaderIdx = 0
    let femaleIdx = 0
    let guitarIdx = 0
    let bassIdx = 0
    let drumIdx = 0
    let keyboardIdx = 0

    const sortedDays = [...selectedDays].sort((a, b) => a.date.localeCompare(b.date))

    for (const day of sortedDays) {
      const dateObj = new Date(day.date + 'T12:00:00')
      const weekNum = Math.ceil(dateObj.getDate() / 7)

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

      const scaleTypeId = day.scaleName ? scaleTypeMap[day.scaleName] || null : null

      const { data: event } = await supabase
        .from('schedule_events')
        .insert({
          schedule_id: scheduleId,
          event_date: day.date,
          day_of_week: day.dayOfWeek,
          week_number: weekNum,
          scale_type_id: scaleTypeId,
        })
        .select('id')
        .single()

      if (!event) continue

      const assignments: { event_id: string; member_id: string; role: string }[] = []

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

      const kbd = getNext(keyboardists, keyboardIdx)
      if (kbd.member) {
        assignments.push({ event_id: event.id, member_id: kbd.member.id, role: 'teclado' })
        keyboardIdx = kbd.newIdx
      }

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

  if (selectedDays.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h2 className="text-lg font-bold">Gerar Escala</h2>
        </div>
        <div className="card text-center py-8">
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhum dia selecionado. Volte ao calendário e selecione os dias desejados.
          </p>
          <Link href="/admin" className="inline-block mt-3 text-sm bg-white text-black font-medium px-4 py-2 rounded-lg">
            Voltar ao Calendário
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)]">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-lg font-bold">Gerar Escala</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Defina o nome da escala para cada dia selecionado.
          </p>
        </div>
      </div>

      {/* Quick name creation */}
      <div className="card space-y-2">
        <label className="text-xs text-[var(--muted-foreground)] block">Nomes de escala disponíveis</label>
        <div className="flex flex-wrap gap-1.5">
          {quickNames.map((name) => (
            <button
              key={name}
              onClick={() => applyNameToAll(name)}
              className="px-2.5 py-1 text-xs rounded-full bg-[var(--accent)] hover:bg-[var(--border)] transition-colors"
              title="Clique para aplicar a todos"
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Novo nome (ex: ALIVE, Celebração...)"
            value={newQuickName}
            onChange={(e) => setNewQuickName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuickName())}
            className="flex-1"
          />
          <button
            onClick={addQuickName}
            disabled={!newQuickName.trim()}
            className="px-3 py-1.5 bg-white text-black rounded-lg text-xs font-medium disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected days with name input */}
      <div className="space-y-1.5">
        {selectedDays.map((day) => {
          const dateObj = new Date(day.date + 'T12:00:00')
          return (
            <div key={day.date} className="card py-2.5 px-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium">
                      {format(dateObj, 'dd/MM')}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {day.dayOfWeek}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Nome da escala..."
                    value={day.scaleName}
                    onChange={(e) => setDayScaleName(day.date, e.target.value)}
                    className="!py-1.5 text-xs"
                  />
                </div>
                <button
                  onClick={() => removeDay(day.date)}
                  className="p-1 rounded hover:bg-[var(--accent)] text-[var(--muted-foreground)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Quick apply buttons */}
              {quickNames.length > 0 && !day.scaleName && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {quickNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setDayScaleName(day.date, name)}
                      className="px-2 py-0.5 text-[10px] rounded bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-white"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Generate button */}
      <div className="sticky bottom-16 pt-3">
        <button
          onClick={generateSchedule}
          disabled={generating || selectedDays.length === 0}
          className="w-full bg-white text-black font-semibold py-2.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              Gerar Escala ({selectedDays.length} dias)
            </>
          )}
        </button>
      </div>
    </div>
  )
}
