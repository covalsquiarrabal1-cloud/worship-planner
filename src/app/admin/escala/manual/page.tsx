'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface Member {
  id: string
  name: string
  gender: 'male' | 'female'
  is_leader: boolean
  is_back: boolean
  is_musician: boolean
  instrument: string | null
}

interface ScaleType {
  id: string
  name: string
}

const roles = [
  { key: 'vocal_1', label: 'Vocal 1' },
  { key: 'vocal_2', label: 'Vocal 2' },
  { key: 'vocal_3', label: 'Vocal 3' },
  { key: 'guitarra', label: 'Guitarra' },
  { key: 'baixo', label: 'Baixo' },
  { key: 'bateria', label: 'Bateria' },
  { key: 'teclado', label: 'Teclado' },
  { key: 'back', label: 'Back' },
]

const dayNames: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta-Feira',
  6: 'Sábado',
}

export default function EscalaManualPage() {
  const router = useRouter()
  const supabase = createClient()

  const [members, setMembers] = useState<Member[]>([])
  const [scaleTypes, setScaleTypes] = useState<ScaleType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedScaleTypeId, setSelectedScaleTypeId] = useState('')
  const [assignments, setAssignments] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [membersRes, scaleTypesRes] = await Promise.all([
      supabase.from('members').select('*').eq('is_blocked', false).order('name'),
      supabase.from('scale_types').select('id, name').order('name'),
    ])
    setMembers(membersRes.data || [])
    setScaleTypes(scaleTypesRes.data || [])
    setLoading(false)
  }

  function setRoleMember(role: string, memberId: string) {
    setAssignments((prev) => ({
      ...prev,
      [role]: memberId,
    }))
  }

  function getMembersForRole(role: string): Member[] {
    if (role.startsWith('vocal')) {
      return members.filter((m) => !m.is_musician)
    }
    if (role === 'guitarra') return members.filter((m) => m.is_musician && m.instrument === 'guitarra')
    if (role === 'baixo') return members.filter((m) => m.is_musician && m.instrument === 'baixo')
    if (role === 'bateria') return members.filter((m) => m.is_musician && m.instrument === 'bateria')
    if (role === 'teclado') return members.filter((m) => m.is_musician && m.instrument === 'teclado')
    if (role === 'back') return members.filter((m) => m.is_back)
    return members
  }

  async function handleSave() {
    if (!selectedDate) return
    setSaving(true)

    const dateObj = new Date(selectedDate + 'T12:00:00')
    const monthNum = dateObj.getMonth() + 1
    const yearNum = dateObj.getFullYear()
    const weekNum = Math.ceil(dateObj.getDate() / 7)
    const dayOfWeek = dayNames[getDay(dateObj)] || ''

    // Get or create schedule for the month
    const { data: existingSchedule } = await supabase
      .from('schedules')
      .select('id')
      .eq('month', monthNum)
      .eq('year', yearNum)
      .single()

    let scheduleId: string

    if (existingSchedule) {
      scheduleId = existingSchedule.id
    } else {
      const { data: newSchedule } = await supabase
        .from('schedules')
        .insert({ month: monthNum, year: yearNum })
        .select('id')
        .single()
      scheduleId = newSchedule!.id
    }

    // Check if event already exists for this date
    const { data: existingEvent } = await supabase
      .from('schedule_events')
      .select('id')
      .eq('schedule_id', scheduleId)
      .eq('event_date', selectedDate)
      .single()

    let eventId: string

    if (existingEvent) {
      eventId = existingEvent.id
      // Delete existing assignments
      await supabase.from('schedule_assignments').delete().eq('event_id', eventId)
      // Update the event
      await supabase
        .from('schedule_events')
        .update({
          day_of_week: dayOfWeek,
          week_number: weekNum,
          scale_type_id: selectedScaleTypeId || null,
        })
        .eq('id', eventId)
    } else {
      const { data: newEvent } = await supabase
        .from('schedule_events')
        .insert({
          schedule_id: scheduleId,
          event_date: selectedDate,
          day_of_week: dayOfWeek,
          week_number: weekNum,
          scale_type_id: selectedScaleTypeId || null,
        })
        .select('id')
        .single()
      eventId = newEvent!.id
    }

    // Insert assignments
    const assignmentRows = Object.entries(assignments)
      .filter(([, memberId]) => memberId)
      .map(([role, memberId]) => ({
        event_id: eventId,
        member_id: memberId,
        role,
      }))

    if (assignmentRows.length > 0) {
      await supabase.from('schedule_assignments').insert(assignmentRows)
    }

    setSaving(false)
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
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)]">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-lg font-bold">Escala Manual</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Crie uma escala escolhendo data, nome e participantes.
          </p>
        </div>
      </div>

      {/* Date picker */}
      <div className="card space-y-3">
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Data da celebração</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Nome da escala</label>
          <select
            value={selectedScaleTypeId}
            onChange={(e) => setSelectedScaleTypeId(e.target.value)}
          >
            <option value="">Selecione o tipo</option>
            {scaleTypes.map((st) => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        </div>

        {selectedDate && (
          <p className="text-xs text-[var(--muted-foreground)]">
            {format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        )}
      </div>

      {/* Role assignments */}
      <div className="card space-y-3">
        <h3 className="text-sm font-medium">Participantes</h3>
        <div className="space-y-2">
          {roles.map((role) => {
            const availableMembers = getMembersForRole(role.key)
            return (
              <div key={role.key} className="flex items-center gap-3">
                <label className="text-xs text-[var(--muted-foreground)] w-20 shrink-0">
                  {role.label}
                </label>
                <select
                  value={assignments[role.key] || ''}
                  onChange={(e) => setRoleMember(role.key, e.target.value)}
                  className="flex-1"
                >
                  <option value="">— Selecione —</option>
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="sticky bottom-16 pt-3">
        <button
          onClick={handleSave}
          disabled={saving || !selectedDate}
          className="w-full bg-white text-black font-semibold py-2.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Escala
            </>
          )}
        </button>
      </div>
    </div>
  )
}
