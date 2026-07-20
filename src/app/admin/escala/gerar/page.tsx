'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { format, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Calendar, ArrowLeft, X, Plus } from 'lucide-react'
import Link from 'next/link'

interface ScaleType {
  id: string
  name: string
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
    const [scaleTypesRes, dayDefaultsRes] = await Promise.all([
      supabase.from('scale_types').select('id, name').order('name'),
      fetch('/api/day-defaults'),
    ])

    const existingNames = (scaleTypesRes.data || []).map((st: ScaleType) => st.name)
    setQuickNames(existingNames)

    // Load day defaults
    let dayDefaultsData: { day_of_week: number; scale_name: string; is_variable: boolean }[] = []
    if (dayDefaultsRes.ok) {
      const dd = await dayDefaultsRes.json()
      if (Array.isArray(dd)) dayDefaultsData = dd
    }

    // Initialize days from URL params with defaults applied
    if (preSelectedDates) {
      const dates = preSelectedDates.split(',')
      const days: SelectedDay[] = dates.map((dateStr) => {
        const dateObj = new Date(dateStr + 'T12:00:00')
        const dow = getDay(dateObj)
        const dayOfWeek = dayNames[dow] || ''
        
        // Auto-fill scale name from defaults
        const defaultForDay = dayDefaultsData.find(d => d.day_of_week === dow)
        const autoName = (defaultForDay && !defaultForDay.is_variable) ? (defaultForDay.scale_name || '') : ''
        
        return { date: dateStr, dayOfWeek, scaleName: autoName }
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
      fetch('/api/scale-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newQuickName.trim(), type: 'normal' }),
      })
      setNewQuickName('')
    }
  }

  async function generateSchedule() {
    if (selectedDays.length === 0) return
    setGenerating(true)

    try {
      const res = await fetch('/api/gerar-escala', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, selectedDays }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert('Erro ao gerar escala: ' + (data.error || 'Erro desconhecido'))
        setGenerating(false)
        return
      }

      router.push('/admin')
    } catch {
      alert('Erro de conexão ao gerar escala')
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (selectedDays.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h2 className="text-lg font-bold">Gerar Escala</h2>
        </div>
        <div className="card text-center py-12">
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhum dia selecionado. Volte ao calendário e selecione os dias desejados.
          </p>
          <Link href="/admin" className="inline-block mt-4 text-sm bg-white text-black font-medium px-5 py-2.5 rounded-lg hover:bg-gray-100">
            Voltar ao Calendário
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)]">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-lg font-bold">Gerar Escala</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Defina o nome da escala para cada dia.
          </p>
        </div>
      </div>

      {/* Quick name creation */}
      <div className="card space-y-3">
        <label className="text-sm font-medium text-[var(--muted-foreground)] block">Nomes de escala</label>
        {quickNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickNames.map((name) => (
              <button
                key={name}
                onClick={() => applyNameToAll(name)}
                className="px-3 py-1.5 text-xs rounded-lg bg-[var(--accent)] hover:bg-[var(--border)] transition-colors"
                title="Aplicar a todos"
              >
                {name}
              </button>
            ))}
          </div>
        )}
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
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-100"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected days */}
      <div className="space-y-2">
        {selectedDays.map((day) => {
          const dateObj = new Date(day.date + 'T12:00:00')
          return (
            <div key={day.date} className={`card ${day.scaleName ? 'border-green-500/30' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold">
                      {format(dateObj, 'dd/MM')}
                    </span>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {day.dayOfWeek}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Nome da escala..."
                    value={day.scaleName}
                    onChange={(e) => setDayScaleName(day.date, e.target.value)}
                  />
                  {/* Quick apply */}
                  {quickNames.length > 0 && !day.scaleName && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {quickNames.map((name) => (
                        <button
                          key={name}
                          onClick={() => setDayScaleName(day.date, name)}
                          className="px-2.5 py-1 text-xs rounded bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-white transition-colors"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeDay(day.date)}
                  className="p-2 rounded-lg hover:bg-[var(--accent)] text-[var(--muted-foreground)] shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Generate button */}
      <div className="sticky bottom-16 pt-4">
        <button
          onClick={generateSchedule}
          disabled={generating || selectedDays.length === 0}
          className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 text-sm hover:bg-gray-100 transition-colors"
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
