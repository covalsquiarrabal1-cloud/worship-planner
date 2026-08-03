'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, X, ImagePlus } from 'lucide-react'
import { getMinistryIcon3D } from '@/lib/ministry-icons'

interface Ministry {
  id: string
  name: string
  slug: string
}

interface MinistryEvent {
  id: string
  event_date: string
  day_of_week: string
  scale_name: string | null
  num_celebrations: number
  assignments: { id: string; celebration_number: number; role_name: string | null; member: { id: string; name: string } | null }[]
}

export default function EscalasMinisteriosAdminPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [selectedMinistry, setSelectedMinistry] = useState<string | null>(null)
  const [events, setEvents] = useState<MinistryEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [bgImage, setBgImage] = useState<string | null>(null)

  useEffect(() => {
    loadMinistries()
    // Load saved background
    const saved = localStorage.getItem('escalas_gerais_bg')
    if (saved) setBgImage(saved)
  }, [])

  useEffect(() => {
    if (selectedMinistry) loadEvents()
  }, [selectedMinistry, currentDate])

  async function loadMinistries() {
    const res = await fetch('/api/ministries')
    if (res.ok) {
      const data = await res.json()
      setMinistries(data.filter((m: any) => m.slug !== 'louvor'))
    }
    setLoading(false)
  }

  async function loadEvents() {
    setLoadingEvents(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
    const ministry = ministries.find(m => m.id === selectedMinistry)
    if (!ministry) { setLoadingEvents(false); return }

    const res = await fetch(`/api/ministries/${ministry.slug}/events?start=${start}&end=${end}`)
    if (res.ok) setEvents(await res.json())
    else setEvents([])
    setLoadingEvents(false)
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setBgImage(dataUrl)
      localStorage.setItem('escalas_gerais_bg', dataUrl)
    }
    reader.readAsDataURL(file)
  }

  function removeBgImage() {
    setBgImage(null)
    localStorage.removeItem('escalas_gerais_bg')
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  const selectedMinistryData = ministries.find(m => m.id === selectedMinistry)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Escalas Gerais</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Selecione um ministério para ver a escala.</p>
        </div>
        {/* Background image toggle */}
        <label className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)] cursor-pointer transition-colors" title="Adicionar foto de fundo">
          <ImagePlus className="w-5 h-5 text-[var(--muted-foreground)]" />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      </div>

      {/* Ministry grid with background */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Background */}
        {bgImage ? (
          <div className="absolute inset-0">
            <img src={bgImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
            <button
              onClick={removeBgImage}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 z-10"
              title="Remover foto"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c2128] via-[#161b22] to-[#0d1117] border border-[var(--border)] rounded-2xl" />
        )}

        {/* Grid of ministry icons */}
        <div className="relative z-10 p-6">
          <div className="flex flex-wrap justify-center gap-4">
            {ministries.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMinistry(selectedMinistry === m.id ? null : m.id)}
                className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${
                  selectedMinistry === m.id ? 'scale-105' : 'hover:scale-105'
                }`}
              >
                <div className={`w-[60px] h-[60px] rounded-[14px] flex items-center justify-center shadow-lg transition-all ${
                  selectedMinistry === m.id
                    ? 'bg-[#58a6ff]/20 border-2 border-[#58a6ff] shadow-[0_0_16px_rgba(88,166,255,0.3)]'
                    : 'bg-[#1c2128]/80 border border-[#30363d]/60 hover:border-[#58a6ff]/50'
                }`}>
                  <img
                    src={getMinistryIcon3D(m.slug)}
                    alt={m.name}
                    className="w-[36px] h-[36px] object-contain"
                  />
                </div>
                <span className={`text-[9px] text-center leading-tight font-medium w-[65px] break-words ${
                  selectedMinistry === m.id ? 'text-[#58a6ff]' : 'text-[var(--muted-foreground)]'
                }`}>
                  {m.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected ministry schedule */}
      {selectedMinistry && selectedMinistryData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">{selectedMinistryData.name}</h3>
            <button onClick={() => setSelectedMinistry(null)} className="text-xs text-[var(--muted-foreground)]">✕ Fechar</button>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {loadingEvents ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : events.length === 0 ? (
            <div className="card text-center py-8 text-[var(--muted-foreground)]">
              <p className="text-sm">Nenhuma escala para este mês.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="card space-y-2">
                  <div>
                    <span className="text-xs text-[var(--muted-foreground)] capitalize">{event.day_of_week}, {event.event_date.slice(8,10)}/{event.event_date.slice(5,7)}</span>
                    {event.scale_name && <span className="text-xs text-green-400 ml-2 font-medium">{event.scale_name}</span>}
                  </div>
                  <div className="space-y-1">
                    {event.assignments.sort((a, b) => a.celebration_number - b.celebration_number).map(a => (
                      <div key={a.id} className="flex items-center gap-2">
                        {event.num_celebrations > 1 && (
                          <span className="text-[10px] text-[var(--muted-foreground)]">C{a.celebration_number}:</span>
                        )}
                        <span className="text-sm font-medium">{a.member?.name || '-'}</span>
                        {a.role_name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#58a6ff]/15 text-[#58a6ff] font-medium">{a.role_name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
