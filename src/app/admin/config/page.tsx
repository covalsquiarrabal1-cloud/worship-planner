'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Loader2, X, LogOut, Tag, CalendarOff, Guitar, Users, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ScaleType {
  id: string
  name: string
  type: string
}

interface Instrument {
  id: string
  name: string
}

interface BandPatternItem {
  id: string
  role_name: string
  instrument_id: string | null
  quantity: number
  gender_filter: 'male' | 'female' | 'any'
  is_vocal: boolean
  sort_order: number
  instrument: { id: string; name: string } | null
}

interface DayDefault {
  day_of_week: number
  scale_name: string
  is_variable: boolean
}

export default function ConfigPage() {
  const [scaleTypes, setScaleTypes] = useState<ScaleType[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [bandPattern, setBandPattern] = useState<BandPatternItem[]>([])
  const [dayDefaults, setDayDefaults] = useState<DayDefault[]>([])
  const [loading, setLoading] = useState(true)
  const [showScaleForm, setShowScaleForm] = useState(false)
  const [showInstrumentForm, setShowInstrumentForm] = useState(false)
  const [showPatternForm, setShowPatternForm] = useState(false)
  const [newScaleName, setNewScaleName] = useState('')
  const [newInstrumentName, setNewInstrumentName] = useState('')
  const [savingDefaults, setSavingDefaults] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [instrRes, patternRes, defaultsRes] = await Promise.all([
        fetch('/api/instruments'),
        fetch('/api/band-pattern'),
        fetch('/api/day-defaults'),
      ])

      if (instrRes.ok) {
        const instrData = await instrRes.json()
        setInstruments(Array.isArray(instrData) ? instrData : [])
      }

      if (patternRes.ok) {
        const patternData = await patternRes.json()
        setBandPattern(Array.isArray(patternData) ? patternData : [])
      }

      if (defaultsRes.ok) {
        const defaultsData = await defaultsRes.json()
        if (Array.isArray(defaultsData) && defaultsData.length > 0) {
          setDayDefaults(defaultsData)
        } else {
          // Initialize with empty defaults for common celebration days
          setDayDefaults([
            { day_of_week: 5, scale_name: '', is_variable: true },
            { day_of_week: 6, scale_name: '', is_variable: false },
            { day_of_week: 0, scale_name: '', is_variable: false },
          ])
        }
      }
    } catch (e) {
      console.error('Error loading config:', e)
    }

    const { data: stData } = await supabase.from('scale_types').select('*').order('name')
    setScaleTypes(stData || [])

    setLoading(false)
  }

  // --- Scale Types ---
  async function addScaleType(e: React.FormEvent) {
    e.preventDefault()
    if (!newScaleName.trim()) return
    await fetch('/api/scale-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newScaleName.trim(), type: 'normal' }),
    })
    setNewScaleName('')
    setShowScaleForm(false)
    loadAll()
  }

  async function deleteScaleType(id: string) {
    if (!confirm('Excluir este tipo de escala?')) return
    await fetch(`/api/scale-types?id=${id}`, { method: 'DELETE' })
    loadAll()
  }

  // --- Instruments ---
  async function addInstrument(e: React.FormEvent) {
    e.preventDefault()
    if (!newInstrumentName.trim()) return
    await fetch('/api/instruments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newInstrumentName.trim() }),
    })
    setNewInstrumentName('')
    setShowInstrumentForm(false)
    loadAll()
  }

  async function deleteInstrument(id: string) {
    if (!confirm('Excluir este instrumento?')) return
    await fetch(`/api/instruments?id=${id}`, { method: 'DELETE' })
    loadAll()
  }

  // --- Band Pattern ---
  async function deleteBandPatternItem(id: string) {
    if (!confirm('Excluir este item do padrão?')) return
    await fetch(`/api/band-pattern?id=${id}`, { method: 'DELETE' })
    loadAll()
  }

  // --- Day Defaults ---
  function updateDayDefault(dayOfWeek: number, field: 'scale_name' | 'is_variable', value: string | boolean) {
    setDayDefaults(prev =>
      prev.map(d => d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d)
    )
  }

  async function saveDayDefaults() {
    setSavingDefaults(true)
    await fetch('/api/day-defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaults: dayDefaults }),
    })
    setSavingDefaults(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-8">
      <h2 className="text-xl font-bold">Configurações</h2>

      {/* ========== INSTRUMENTOS ========== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-base">
            <Guitar className="w-5 h-5" />
            Instrumentos
          </h3>
          <button
            onClick={() => setShowInstrumentForm(true)}
            className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {instruments.map((instr) => (
            <div key={instr.id} className="card flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{instr.name}</span>
              <button onClick={() => deleteInstrument(instr.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {instruments.length === 0 && !showInstrumentForm && (
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum instrumento cadastrado.</p>
        )}

        {showInstrumentForm && (
          <form onSubmit={addInstrument} className="card flex gap-3">
            <input
              type="text"
              value={newInstrumentName}
              onChange={(e) => setNewInstrumentName(e.target.value)}
              placeholder="Nome do instrumento"
              required
              className="flex-1"
              autoFocus
            />
            <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 shrink-0">
              Salvar
            </button>
            <button type="button" onClick={() => setShowInstrumentForm(false)} className="p-2 text-[var(--muted-foreground)] shrink-0">
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </section>

      {/* ========== PADRÃO DE BANDA ========== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-base">
            <Users className="w-5 h-5" />
            Padrão de Banda
          </h3>
          <button
            onClick={() => setShowPatternForm(true)}
            className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>

        <p className="text-sm text-[var(--muted-foreground)]">
          Defina a formação padrão para geração automática de escalas.
        </p>

        <div className="space-y-2">
          {bandPattern.map((item) => (
            <div key={item.id} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-bold text-white bg-[var(--accent)] w-7 h-7 flex items-center justify-center rounded shrink-0">
                  {item.quantity}
                </span>
                <div>
                  <span className="text-sm font-medium">{item.role_name}</span>
                  {item.instrument && (
                    <span className="text-xs text-[var(--muted-foreground)] ml-2">({item.instrument.name})</span>
                  )}
                </div>
                {item.is_vocal && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0">
                    {item.gender_filter === 'male' ? 'Masc' : item.gender_filter === 'female' ? 'Fem' : 'Qualquer'}
                  </span>
                )}
              </div>
              <button onClick={() => deleteBandPatternItem(item.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {bandPattern.length === 0 && !showPatternForm && (
            <p className="text-sm text-[var(--muted-foreground)]">Nenhum padrão definido.</p>
          )}
        </div>

        {showPatternForm && (
          <BandPatternForm
            instruments={instruments}
            onClose={() => setShowPatternForm(false)}
            onSave={() => { setShowPatternForm(false); loadAll() }}
            nextOrder={bandPattern.length + 1}
          />
        )}
      </section>

      {/* ========== ESCALA PADRÃO POR DIA ========== */}
      <section className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-base">
          <Calendar className="w-5 h-5" />
          Escala Padrão por Dia
        </h3>

        <p className="text-sm text-[var(--muted-foreground)]">
          Defina qual escala é usada por padrão em cada dia. Dias &quot;variáveis&quot; não terão nome pré-preenchido.
        </p>

        <div className="space-y-2">
          {dayDefaults.map((dd) => {
            const dayLabel = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dd.day_of_week]
            return (
              <div key={dd.day_of_week} className="card flex items-center gap-4">
                <span className="text-sm font-medium w-20 shrink-0">{dayLabel}</span>
                <div className="flex-1">
                  {dd.is_variable ? (
                    <span className="text-sm text-[var(--muted-foreground)] italic">Variável</span>
                  ) : (
                    <select
                      value={dd.scale_name}
                      onChange={(e) => updateDayDefault(dd.day_of_week, 'scale_name', e.target.value)}
                      className="!py-2"
                    >
                      <option value="">Selecione...</option>
                      {scaleTypes.map((st) => (
                        <option key={st.id} value={st.name}>{st.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={dd.is_variable}
                    onChange={(e) => updateDayDefault(dd.day_of_week, 'is_variable', e.target.checked)}
                  />
                  <span className="text-xs text-[var(--muted-foreground)]">Variável</span>
                </label>
              </div>
            )
          })}
        </div>

        <button
          onClick={saveDayDefaults}
          disabled={savingDefaults}
          className="bg-white text-black font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
        >
          {savingDefaults ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Padrões'}
        </button>
      </section>

      {/* ========== TIPOS DE ESCALA ========== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-base">
            <Tag className="w-5 h-5" />
            Tipos de Escala
          </h3>
          <button
            onClick={() => setShowScaleForm(true)}
            className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>

        <div className="space-y-2">
          {scaleTypes.map((st) => (
            <div key={st.id} className="card flex items-center justify-between">
              <span className="text-sm font-medium">{st.name}</span>
              <button onClick={() => deleteScaleType(st.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {scaleTypes.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">Nenhum tipo cadastrado.</p>
          )}
        </div>

        {showScaleForm && (
          <form onSubmit={addScaleType} className="card flex gap-3">
            <input
              type="text"
              value={newScaleName}
              onChange={(e) => setNewScaleName(e.target.value)}
              placeholder="Nome (ex: ALIVE, CELEBRAÇÃO)"
              required
              className="flex-1"
              autoFocus
            />
            <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 shrink-0">
              Salvar
            </button>
            <button type="button" onClick={() => setShowScaleForm(false)} className="p-2 text-[var(--muted-foreground)] shrink-0">
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </section>

      {/* ========== BLOQUEIOS ========== */}
      <section>
        <Link href="/admin/membros/bloqueios" className="card flex items-center gap-4 w-full hover:border-[#444] transition-colors">
          <CalendarOff className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="font-medium text-sm">Bloqueios Específicos</p>
            <p className="text-xs text-[var(--muted-foreground)]">Bloquear membros em datas específicas</p>
          </div>
        </Link>
      </section>

      {/* ========== LOGOUT ========== */}
      <section>
        <button onClick={handleLogout} className="card flex items-center gap-4 w-full text-red-400 hover:border-red-500/30 transition-colors">
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </section>
    </div>
  )
}

function BandPatternForm({
  instruments,
  onClose,
  onSave,
  nextOrder,
}: {
  instruments: Instrument[]
  onClose: () => void
  onSave: () => void
  nextOrder: number
}) {
  const [roleName, setRoleName] = useState('')
  const [instrumentId, setInstrumentId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'any'>('any')
  const [isVocal, setIsVocal] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await fetch('/api/band-pattern', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role_name: roleName,
        instrument_id: instrumentId || null,
        quantity,
        gender_filter: genderFilter,
        is_vocal: isVocal,
        sort_order: nextOrder,
      }),
    })

    setSaving(false)
    onSave()
  }

  return (
    <div className="card border-white/20 space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold">Novo item do padrão</h4>
        <button onClick={onClose} className="p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Nome da função</label>
          <input
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Ex: Guitarra, Vocal Masculino..."
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Quantidade</label>
            <input
              type="number"
              min={1}
              max={5}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Instrumento</label>
            <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>
              <option value="">Nenhum (vocal)</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Filtro de gênero</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'any', label: 'Qualquer' },
              { key: 'male', label: 'Masculino' },
              { key: 'female', label: 'Feminino' },
            ].map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGenderFilter(g.key as typeof genderFilter)}
                className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                  genderFilter === g.key
                    ? 'bg-white text-black'
                    : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-4 cursor-pointer px-4 py-3 bg-[var(--accent)] rounded-lg">
          <input
            type="checkbox"
            checked={isVocal}
            onChange={(e) => setIsVocal(e.target.checked)}
          />
          <span className="text-sm">É vocal (não instrumentista)</span>
        </label>

        <button
          type="submit"
          disabled={saving || !roleName}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Adicionar ao padrão'}
        </button>
      </form>
    </div>
  )
}
