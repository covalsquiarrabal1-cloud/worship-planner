'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, X, Guitar, Users, Calendar, Tag, Edit2, ArrowLeft, Settings } from 'lucide-react'
import Link from 'next/link'

interface ScaleType {
  id: string
  name: string
  type: string
  male_vocals: number
  female_vocals: number
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

export default function ConfigLouvorPage() {
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
  const [editingScaleType, setEditingScaleType] = useState<ScaleType | null>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [instrRes, patternRes, defaultsRes, scaleTypesRes] = await Promise.all([
      fetch('/api/instruments'),
      fetch('/api/band-pattern'),
      fetch('/api/day-defaults'),
      fetch('/api/scale-types'),
    ])
    if (instrRes.ok) setInstruments(await instrRes.json())
    if (patternRes.ok) setBandPattern(await patternRes.json())
    if (defaultsRes.ok) {
      const data = await defaultsRes.json()
      if (Array.isArray(data) && data.length > 0) {
        setDayDefaults(data)
      } else {
        setDayDefaults([0,1,2,3,4,5,6].map(d => ({ day_of_week: d, scale_name: '', is_variable: false })))
      }
    }
    if (scaleTypesRes.ok) setScaleTypes(await scaleTypesRes.json())
    setLoading(false)
  }

  async function addScaleType(e: React.FormEvent) {
    e.preventDefault()
    if (!newScaleName.trim()) return
    await fetch('/api/scale-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newScaleName.trim(), type: 'normal' }) })
    setNewScaleName(''); setShowScaleForm(false); loadAll()
  }

  async function deleteScaleType(id: string) {
    if (!confirm('Excluir este tipo de escala?')) return
    await fetch(`/api/scale-types?id=${id}`, { method: 'DELETE' }); loadAll()
  }

  async function addInstrument(e: React.FormEvent) {
    e.preventDefault()
    if (!newInstrumentName.trim()) return
    await fetch('/api/instruments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newInstrumentName.trim() }) })
    setNewInstrumentName(''); setShowInstrumentForm(false); loadAll()
  }

  async function deleteInstrument(id: string) {
    if (!confirm('Excluir este instrumento?')) return
    await fetch(`/api/instruments?id=${id}`, { method: 'DELETE' }); loadAll()
  }

  async function deleteBandPatternItem(id: string) {
    if (!confirm('Excluir este item do padrão?')) return
    await fetch(`/api/band-pattern?id=${id}`, { method: 'DELETE' }); loadAll()
  }

  function updateDayDefault(dayOfWeek: number, field: 'scale_name' | 'is_variable', value: string | boolean) {
    setDayDefaults(prev => prev.map(d => d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d))
  }

  async function saveDayDefaults() {
    setSavingDefaults(true)
    await fetch('/api/day-defaults', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaults: dayDefaults }) })
    setSavingDefaults(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#58a6ff]" />
            Configuração do Louvor
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">Instrumentos, padrão de banda, escalas por dia e tipos</p>
        </div>
      </div>

      {/* ========== INSTRUMENTOS ========== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-base"><Guitar className="w-5 h-5" /> Instrumentos</h3>
          <button onClick={() => setShowInstrumentForm(true)} className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-100"><Plus className="w-4 h-4" /> Novo</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {instruments.map((instr) => (
            <div key={instr.id} className="card flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{instr.name}</span>
              <button onClick={() => deleteInstrument(instr.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        {showInstrumentForm && (
          <form onSubmit={addInstrument} className="card flex gap-3">
            <input type="text" value={newInstrumentName} onChange={(e) => setNewInstrumentName(e.target.value)} placeholder="Nome do instrumento" required className="flex-1" autoFocus />
            <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium">Salvar</button>
            <button type="button" onClick={() => setShowInstrumentForm(false)} className="p-2 text-[var(--muted-foreground)]"><X className="w-4 h-4" /></button>
          </form>
        )}
      </section>

      {/* ========== PADRÃO DE BANDA ========== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-base"><Users className="w-5 h-5" /> Padrão de Banda</h3>
          <button onClick={() => setShowPatternForm(true)} className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-100"><Plus className="w-4 h-4" /> Novo</button>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">Defina a formação padrão para geração automática de escalas.</p>
        <div className="space-y-2">
          {bandPattern.map((item) => (
            <div key={item.id} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-bold text-white bg-[var(--accent)] w-7 h-7 flex items-center justify-center rounded shrink-0">{item.quantity}</span>
                <div>
                  <span className="text-sm font-medium">{item.role_name}</span>
                  {item.instrument && <span className="text-xs text-[var(--muted-foreground)] ml-2">({item.instrument.name})</span>}
                </div>
                {item.is_vocal && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0">
                    {item.gender_filter === 'male' ? 'Masc' : item.gender_filter === 'female' ? 'Fem' : 'Qualquer'}
                  </span>
                )}
              </div>
              <button onClick={() => deleteBandPatternItem(item.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        {showPatternForm && (
          <BandPatternForm instruments={instruments} onClose={() => setShowPatternForm(false)} onSave={() => { setShowPatternForm(false); loadAll() }} nextOrder={bandPattern.length + 1} />
        )}
      </section>

      {/* ========== ESCALA PADRÃO POR DIA ========== */}
      <section className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-base"><Calendar className="w-5 h-5" /> Escala Padrão por Dia</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Defina qual escala é usada por padrão em cada dia. Dias &quot;variáveis&quot; não terão nome pré-preenchido.</p>
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
                    <select value={dd.scale_name} onChange={(e) => updateDayDefault(dd.day_of_week, 'scale_name', e.target.value)} className="!py-2">
                      <option value="">Selecione...</option>
                      {scaleTypes.map((st) => (<option key={st.id} value={st.name}>{st.name}</option>))}
                    </select>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input type="checkbox" checked={dd.is_variable} onChange={(e) => updateDayDefault(dd.day_of_week, 'is_variable', e.target.checked)} />
                  <span className="text-xs text-[var(--muted-foreground)]">Variável</span>
                </label>
              </div>
            )
          })}
        </div>
        <button onClick={saveDayDefaults} disabled={savingDefaults} className="bg-white text-black font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2">
          {savingDefaults ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Padrões'}
        </button>
      </section>

      {/* ========== TIPOS DE ESCALA ========== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-base"><Tag className="w-5 h-5" /> Tipos de Escala</h3>
          <button onClick={() => setShowScaleForm(true)} className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-100"><Plus className="w-4 h-4" /> Novo</button>
        </div>
        <div className="space-y-2">
          {scaleTypes.map((st) => (
            <div key={st.id} className="card flex items-center justify-between gap-3">
              <div className="flex-1">
                <span className="text-sm font-medium">{st.name}</span>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{st.male_vocals ?? 1}H</span>
                  <span className="text-xs bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded">{st.female_vocals ?? 2}M</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditingScaleType(st)} className="p-1.5 text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--accent)] rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteScaleType(st.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
        {showScaleForm && (
          <form onSubmit={addScaleType} className="card flex gap-3">
            <input type="text" value={newScaleName} onChange={(e) => setNewScaleName(e.target.value)} placeholder="Nome (ex: ALIVE, CELEBRAÇÃO)" required className="flex-1" autoFocus />
            <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium">Salvar</button>
            <button type="button" onClick={() => setShowScaleForm(false)} className="p-2 text-[var(--muted-foreground)]"><X className="w-4 h-4" /></button>
          </form>
        )}
        {editingScaleType && (
          <ScaleTypeEditForm scaleType={editingScaleType} onClose={() => setEditingScaleType(null)} onSave={() => { setEditingScaleType(null); loadAll() }} />
        )}
      </section>
    </div>
  )
}

function BandPatternForm({ instruments, onClose, onSave, nextOrder }: { instruments: Instrument[]; onClose: () => void; onSave: () => void; nextOrder: number }) {
  const [roleName, setRoleName] = useState('')
  const [instrumentId, setInstrumentId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'any'>('any')
  const [isVocal, setIsVocal] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roleName.trim()) return
    setSaving(true)
    await fetch('/api/band-pattern', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_name: roleName.trim(), instrument_id: instrumentId || null, quantity, gender_filter: genderFilter, is_vocal: isVocal, sort_order: nextOrder }),
    })
    setSaving(false)
    onSave()
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Nome da função (ex: VOCAL FEMININO)" required autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>
          <option value="">Sem instrumento</option>
          {instruments.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <input type="number" min={1} max={5} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isVocal} onChange={(e) => setIsVocal(e.target.checked)} />
          <span className="text-xs">É vocal?</span>
        </label>
        {isVocal && (
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value as any)} className="!py-1.5 text-xs">
            <option value="any">Qualquer</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Salvando...' : 'Adicionar'}</button>
        <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--muted-foreground)] text-sm">Cancelar</button>
      </div>
    </form>
  )
}

function ScaleTypeEditForm({ scaleType, onClose, onSave }: { scaleType: ScaleType; onClose: () => void; onSave: () => void }) {
  const [maleVocals, setMaleVocals] = useState(scaleType.male_vocals ?? 1)
  const [femaleVocals, setFemaleVocals] = useState(scaleType.female_vocals ?? 2)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/scale-types', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: scaleType.id, male_vocals: maleVocals, female_vocals: femaleVocals }),
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="card space-y-3 border-[#58a6ff]/30">
      <p className="text-sm font-medium">Editar: {scaleType.name}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Vocais Masculinos</label>
            <input type="number" min={0} max={5} value={maleVocals} onChange={(e) => setMaleVocals(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)]">Vocais Femininos</label>
            <input type="number" min={0} max={5} value={femaleVocals} onChange={(e) => setFemaleVocals(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--muted-foreground)] text-sm">Cancelar</button>
        </div>
      </form>
    </div>
  )
}
