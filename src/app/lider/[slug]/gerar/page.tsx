'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Loader2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface MainEvent {
  id: string
  event_date: string
  day_of_week: string
  scale_type: { id: string; name: string } | null
}

interface SelectedDay {
  date: string
  dayOfWeek: string
  scaleName: string
  numCelebrations: number
  uid: string
  selected: boolean
}

export default function LiderGerarEscalaPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = params.slug as string

  const initialMonth = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const initialYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  const [currentDate, setCurrentDate] = useState(new Date(initialYear, initialMonth - 1, 1))
  const [days, setDays] = useState<SelectedDay[]>([])
  const [generating, setGenerating] = useState(false)
  const [membersCount, setMembersCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => {
    loadData()
  }, [currentDate])

  async function loadData() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const [membersRes, eventsRes] = await Promise.all([
      fetch(`/api/ministries/${slug}/members`),
      fetch(`/api/schedule-events?start=${start}&end=${end}`),
    ])

    if (membersRes.ok) {
      const data = await membersRes.json()
      setMembersCount(Array.isArray(data) ? data.length : 0)
    }

    if (eventsRes.ok) {
      const events: MainEvent[] = await eventsRes.json()
      // Convert main schedule events to selectable days
      const newDays: SelectedDay[] = events.map(event => ({
        date: event.event_date,
        dayOfWeek: event.day_of_week,
        scaleName: event.scale_type?.name || '',
        numCelebrations: 1,
        uid: crypto.randomUUID(),
        selected: true,
      }))
      setDays(newDays)
    } else {
      setDays([])
    }

    setLoading(false)
  }

  function toggleDay(uid: string) {
    setDays(prev => prev.map(d => d.uid === uid ? { ...d, selected: !d.selected } : d))
  }

  function updateCelebrations(uid: string, num: number) {
    setDays(prev => prev.map(d => d.uid === uid ? { ...d, numCelebrations: Math.max(1, num) } : d))
  }

  function selectAll() {
    setDays(prev => prev.map(d => ({ ...d, selected: true })))
  }

  function deselectAll() {
    setDays(prev => prev.map(d => ({ ...d, selected: false })))
  }

  const selectedDays = days.filter(d => d.selected)

  async function generate() {
    if (selectedDays.length === 0) return
    if (membersCount === 0) {
      alert('Adicione membros antes de gerar a escala.')
      return
    }

    setGenerating(true)
    try {
      const payload = selectedDays.map(d => ({
        date: d.date,
        dayOfWeek: d.dayOfWeek,
        scaleName: d.scaleName,
        numCelebrations: d.numCelebrations,
      }))

      const res = await fetch(`/api/ministries/${slug}/gerar-escala`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year, selectedDays: payload }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert('Erro: ' + (data.error || 'Erro desconhecido'))
        setGenerating(false)
        return
      }

      const result = await res.json()

      if (result.conflicts && result.conflicts.length > 0) {
        alert('⚠️ Escala gerada com avisos:\n\n' + result.conflicts.join('\n'))
      }

      router.push(`/lider/${slug}`)
    } catch {
      alert('Erro de conexão')
      setGenerating(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/lider/${slug}`} className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-lg font-bold">Gerar Escala</h2>
          <p className="text-sm text-[var(--muted-foreground)] capitalize">{slug.replace('-', ' ')}</p>
        </div>
      </div>

      {/* Members info */}
      {membersCount !== null && (
        <div className={`card text-sm ${membersCount === 0 ? 'border-[#f85149]/40' : ''}`}>
          {membersCount === 0 ? (
            <p className="text-[#f85149]">⚠️ Nenhum membro cadastrado. <Link href={`/lider/${slug}`} className="underline">Adicione membros</Link> antes.</p>
          ) : (
            <p className="text-[var(--muted-foreground)]">👥 {membersCount} membro{membersCount > 1 ? 's' : ''} disponíve{membersCount > 1 ? 'is' : 'l'}.</p>
          )}
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Days from main schedule */}
      {days.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhuma escala principal encontrada para este mês.
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            A escala do louvor precisa ser gerada primeiro pelo admin.
          </p>
        </div>
      ) : (
        <>
          {/* Select/Deselect all */}
          <div className="flex gap-2">
            <button onClick={selectAll} className="flex-1 py-2 rounded-xl text-xs font-medium bg-[#1c2128] border border-[#30363d] hover:border-[#58a6ff] transition-colors">
              Selecionar Todos
            </button>
            <button onClick={deselectAll} className="flex-1 py-2 rounded-xl text-xs font-medium bg-[#1c2128] border border-[#30363d] hover:border-[#f85149] transition-colors">
              Desmarcar Todos
            </button>
          </div>

          <div className="space-y-2">
            {days.map((day) => {
              const dateObj = new Date(day.date + 'T12:00:00')
              return (
                <div
                  key={day.uid}
                  className={`card flex items-center gap-3 cursor-pointer transition-all ${
                    day.selected ? 'border-[#58a6ff]/50' : 'opacity-50'
                  }`}
                  onClick={() => toggleDay(day.uid)}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    day.selected ? 'bg-[#58a6ff] border-[#58a6ff]' : 'border-[#30363d]'
                  }`}>
                    {day.selected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Date & Name */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{format(dateObj, 'dd/MM')}</span>
                      <span className="text-xs text-[var(--muted-foreground)] capitalize">{day.dayOfWeek}</span>
                    </div>
                    {day.scaleName && (
                      <span className="text-xs text-green-400 font-medium">{day.scaleName}</span>
                    )}
                  </div>

                  {/* Celebrations */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs text-[var(--muted-foreground)]">Celeb:</label>
                    <select
                      value={day.numCelebrations}
                      onChange={(e) => updateCelebrations(day.uid, parseInt(e.target.value))}
                      className="text-xs w-14 bg-[#1c2128] border border-[#30363d] rounded-lg px-1 py-1"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Generate Button */}
          {selectedDays.length > 0 && (
            <button
              onClick={generate}
              disabled={generating || membersCount === 0}
              className="w-full bg-[#58a6ff] text-white font-semibold py-4 rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 text-sm hover:bg-[#4c94e0] transition-colors shadow-lg shadow-[#58a6ff]/20"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
              ) : (
                <><Calendar className="w-4 h-4" /> Gerar Escala ({selectedDays.length} dia{selectedDays.length > 1 ? 's' : ''})</>
              )}
            </button>
          )}
        </>
      )}

      <div style={{ height: '60px' }} />
    </div>
  )
}
