'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Loader2, X, LogOut, Tag, CalendarOff, Guitar, Users } from 'lucide-react'
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

export default function ConfigPage() {
  const [scaleTypes, setScaleTypes] = useState<ScaleType[]>([])
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [bandPattern, setBandPattern] = useState<BandPatternItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showScaleForm, setShowScaleForm] = useState(false)
  const [showInstrumentForm, setShowInstrumentForm] = useState(false)
  const [showPatternForm, setShowPatternForm] = useState(false)
  const [newScaleName, setNewScaleName] = useState('')
  const [newInstrumentName, setNewInstrumentName] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [stRes, instrRes, patternRes] = await Promise.all([
      fetch('/api/scale-types-list'),
      fetch('/api/instruments'),
      fetch('/api/band-pattern'),
    ])

    // Scale types fallback (use supabase directly for now)
    const { data: stData } = await supabase.from('scale_types').select('*').order('name')
    setScaleTypes(stData || [])

    if (instrRes.ok) {
      const instrData = await instrRes.json()
      setInstruments(Array.isArray(instrData) ? instrData : [])
    }

    if (patternRes.ok) {
      const patternData = await patternRes.json()
      setBandPattern(Array.isArray(patternData) ? patternData : [])
    }

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
    const serviceClient = await fetch(`/api/scale-types?id=${id}`, { method: 'DELETE' })
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
    <div className="max-w-2xl mx-auto space-y-8">
      <h2 className="text-xl font-bold">Configurações</h2>

      {/* ========== INSTRUMENTOS ========== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
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
            <div key={instr.id} className="card flex items-center justify-between">
              <span className="text-sm font-medium">{instr.name}</span>
              <button onClick={() => deleteInstrument(instr.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {instruments.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)] col-span-full">Nenhum instrumento cadastrado.</p>
          )}
        </div>

        {showInstrumentForm && (
          <form onSubmit={addInstrument} className="card flex gap-2">
            <input
              type="text"
              value={newInstrumentName}
              onChange={(e) => setNewInstrumentName(e.target.value)}
              placeholder="Nome do instrumento"
              required
              className="flex-1"
            />
            <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100">
              Salvar
            </button>
            <button type="button" onClick={() => setShowInstrumentForm(false)} className="p-2 text-[var(--muted-foreground)]">
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </section>

      {/* ========== PADRÃO DE BANDA ========== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
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
          Defina a formação padrão da banda para geração automática de escalas.
        </p>

        <div className="space-y-2">
          {bandPattern.map((item) => (
            <div key={item.id} className="card flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{item.quantity}x {item.role_name}</span>
                {item.instrument && (
                  <span className="text-xs text-[var(--muted-foreground)] ml-2">({item.instrument.name})</span>
                )}
                {item.is_vocal && (
                  <span className="text-xs ml-2 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                    {item.gender_filter === 'male' ? 'Masc' : item.gender_filter === 'female' ? 'Fem' : 'Qualquer'}
                  </span>
                )}
              </div>
              <button onClick={() => deleteBandPatternItem(item.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {bandPattern.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">Nenhum padrão definido. Adicione instrumentos e vocais.</p>
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

      {/* ========== TIPOS DE ESCALA ========== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
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
        </div>

        {showScaleForm && (
          <form onSubmit={addScaleType} className="card flex gap-2">
            <input
              type="text"
              value={newScaleName}
              onChange={(e) => setNewScaleName(e.target.value)}
              placeholder="Nome (ex: ALIVE, CELEBRAÇÃO)"
              required
              className="flex-1"
            />
            <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100">
              Salvar
            </button>
            <button type="button" onClick={() => setShowScaleForm(false)} className="p-2 text-[var(--muted-foreground)]">
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </section>

      {/* ========== BLOQUEIOS ========== */}
      <section>
        <Link href="/admin/membros/bloqueios" className="card flex items-center gap-4 w-full hover:border-[#444] transition-colors">
          <CalendarOff className="w-5 h-5 text-red-400" />
          <div>
            <p className="font-medium text-sm">Bloqueios Específicos</p>
            <p className="text-xs text-[var(--muted-foreground)]">Bloquear membros em datas específicas</p>
          </div>
        </Link>
      </section>

      {/* ========== LOGOUT ========== */}
      <section>
        <button onClick={handleLogout} className="card flex items-center gap-4 w-full text-red-400 hover:border-red-500/30 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </section>
    </div>
  )
}

// --- Band Pattern Form Component ---
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
    <div className="card border-white/20 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Novo item do padrão</h4>
        <button onClick={onClose} className="p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--muted-foreground)]">Nome da função</label>
          <input
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Ex: Guitarra, Vocal Masculino..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-foreground)]">Quantidade</label>
            <input
              type="number"
              min={1}
              max={5}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-foreground)]">Instrumento</label>
            <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>
              <option value="">Nenhum (vocal)</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--muted-foreground)]">Filtro de gênero</label>
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
                className={`py-2 rounded-lg text-xs font-medium transition-all ${
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

        <label className="flex items-center gap-4 cursor-pointer py-2">
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
          className="w-full bg-white text-black font-semibold py-2.5 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Adicionar ao padrão'}
        </button>
      </form>
    </div>
  )
}
