'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Search, X, Edit2, Check } from 'lucide-react'
import Link from 'next/link'

interface SetlistItem {
  id: string
  number: number
  title: string
  version: string | null
  celebration_type: string | null
  vocal_type: string | null
  worship_type: string | null
  description: string | null
  key: string | null
  status: string
}

export default function SetlistPage() {
  const [items, setItems] = useState<SetlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCelebration, setFilterCelebration] = useState('')
  const [filterVocal, setFilterVocal] = useState('')
  const [filterWorship, setFilterWorship] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<SetlistItem>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ title: '', version: '', celebration_type: '', vocal_type: '', worship_type: '', description: '', key: '', status: 'ON' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadSetlist() }, [])

  async function loadSetlist() {
    setLoading(true)
    const res = await fetch('/api/setlist')
    if (res.ok) {
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  async function seedData() {
    if (!confirm('Importar 215 louvores do repertório? Isso só deve ser feito uma vez.')) return
    setSaving(true)
    const res = await fetch('/api/setlist/seed', { method: 'POST' })
    if (res.ok) {
      loadSetlist()
    } else {
      alert('Erro ao importar')
    }
    setSaving(false)
  }

  async function addItem() {
    if (!newItem.title.trim()) return
    setSaving(true)
    const nextNumber = items.length > 0 ? Math.max(...items.map(i => i.number)) + 1 : 1
    await fetch('/api/setlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, number: nextNumber }),
    })
    setNewItem({ title: '', version: '', celebration_type: '', vocal_type: '', worship_type: '', description: '', key: '', status: 'ON' })
    setShowAddForm(false)
    setSaving(false)
    loadSetlist()
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    await fetch('/api/setlist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, ...editData }),
    })
    setEditingId(null)
    setEditData({})
    setSaving(false)
    loadSetlist()
  }

  async function toggleStatus(item: SetlistItem) {
    const newStatus = item.status === 'ON' ? 'OFF' : 'ON'
    await fetch('/api/setlist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: newStatus }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
  }

  function startEdit(item: SetlistItem) {
    setEditingId(item.id)
    setEditData({
      title: item.title,
      version: item.version || '',
      celebration_type: item.celebration_type || '',
      vocal_type: item.vocal_type || '',
      worship_type: item.worship_type || '',
      description: item.description || '',
      key: item.key || '',
    })
  }

  const filtered = items.filter(item => {
    const q = search.toLowerCase()
    const matchesSearch = !q || (
      item.title.toLowerCase().includes(q) ||
      (item.version || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    )
    const matchesCelebration = !filterCelebration || (item.celebration_type || '').toUpperCase() === filterCelebration
    const matchesVocal = !filterVocal || (item.vocal_type || '').toUpperCase() === filterVocal
    const matchesWorship = !filterWorship || (item.worship_type || '').toUpperCase() === filterWorship
    const matchesStatus = !filterStatus || item.status === filterStatus
    return matchesSearch && matchesCelebration && matchesVocal && matchesWorship && matchesStatus
  })

  // Get unique values for filter dropdowns
  const celebrationTypes = [...new Set(items.map(i => i.celebration_type).filter(Boolean))].sort() as string[]
  const vocalTypes = [...new Set(items.map(i => i.vocal_type).filter(Boolean))].sort() as string[]
  const worshipTypes = [...new Set(items.map(i => i.worship_type).filter(Boolean))].sort() as string[]

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-bold">Set List ({filtered.length}/{items.length})</h2>
        <div className="flex items-center gap-2">
          {items.length === 0 && (
            <button onClick={seedData} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Importar Repertório'}
            </button>
          )}
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Buscar louvor, versão, tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold">Novo Louvor</h4>
            <button onClick={() => setShowAddForm(false)} className="p-1"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input placeholder="Louvor *" value={newItem.title} onChange={(e) => setNewItem(p => ({ ...p, title: e.target.value }))} />
            <input placeholder="Versão" value={newItem.version} onChange={(e) => setNewItem(p => ({ ...p, version: e.target.value }))} />
            <input placeholder="Tipo Celebração (GERAL, ALIVE...)" value={newItem.celebration_type} onChange={(e) => setNewItem(p => ({ ...p, celebration_type: e.target.value }))} />
            <input placeholder="Tipo Vocal (MASCULINO, FEMININO...)" value={newItem.vocal_type} onChange={(e) => setNewItem(p => ({ ...p, vocal_type: e.target.value }))} />
            <input placeholder="Tipo de Louvor" value={newItem.worship_type} onChange={(e) => setNewItem(p => ({ ...p, worship_type: e.target.value }))} />
            <input placeholder="Descrição" value={newItem.description} onChange={(e) => setNewItem(p => ({ ...p, description: e.target.value }))} />
            <input placeholder="Tom" value={newItem.key} onChange={(e) => setNewItem(p => ({ ...p, key: e.target.value }))} />
          </div>
          <button onClick={addItem} disabled={saving || !newItem.title.trim()} className="bg-white text-black font-medium px-5 py-2 rounded-lg text-sm disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '1400px' }}>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]" style={{ width: '45px' }}>#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]" style={{ width: '220px' }}>
                <span>Louvor</span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]" style={{ width: '200px' }}>
                <span>Versão</span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]" style={{ width: '160px' }}>
                <select value={filterCelebration} onChange={(e) => setFilterCelebration(e.target.value)} className="!py-1 !px-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded cursor-pointer w-full">
                  <option value="">Tipo Celeb. ▼</option>
                  {celebrationTypes.map(t => <option key={t} value={t.toUpperCase()}>{t}</option>)}
                </select>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]" style={{ width: '180px' }}>
                <select value={filterVocal} onChange={(e) => setFilterVocal(e.target.value)} className="!py-1 !px-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded cursor-pointer w-full">
                  <option value="">Tipo Vocal ▼</option>
                  {vocalTypes.map(t => <option key={t} value={t.toUpperCase()}>{t}</option>)}
                </select>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]" style={{ width: '150px' }}>
                <select value={filterWorship} onChange={(e) => setFilterWorship(e.target.value)} className="!py-1 !px-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded cursor-pointer w-full">
                  <option value="">Tipo Louvor ▼</option>
                  {worshipTypes.map(t => <option key={t} value={t.toUpperCase()}>{t}</option>)}
                </select>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]" style={{ width: '140px' }}>
                <span>Descrição</span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]" style={{ width: '70px' }}>
                <span>Tom</span>
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)]" style={{ width: '80px' }}>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="!py-1 !px-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded cursor-pointer w-full">
                  <option value="">Status ▼</option>
                  <option value="ON">ON</option>
                  <option value="OFF">OFF</option>
                </select>
              </th>
              <th style={{ width: '45px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className={`border-b border-[var(--border)] hover:bg-[var(--accent)]/50 ${item.status === 'OFF' ? 'opacity-40' : ''}`}>
                {editingId === item.id ? (
                  <>
                    <td className="px-4 py-2 text-xs">{item.number}</td>
                    <td className="px-3 py-1.5"><input className="!py-1 text-xs w-full" value={editData.title || ''} onChange={(e) => setEditData(p => ({ ...p, title: e.target.value }))} /></td>
                    <td className="px-3 py-1.5"><input className="!py-1 text-xs w-full" value={editData.version || ''} onChange={(e) => setEditData(p => ({ ...p, version: e.target.value }))} /></td>
                    <td className="px-3 py-1.5"><input className="!py-1 text-xs w-full" value={editData.celebration_type || ''} onChange={(e) => setEditData(p => ({ ...p, celebration_type: e.target.value }))} /></td>
                    <td className="px-3 py-1.5"><input className="!py-1 text-xs w-full" value={editData.vocal_type || ''} onChange={(e) => setEditData(p => ({ ...p, vocal_type: e.target.value }))} /></td>
                    <td className="px-3 py-1.5"><input className="!py-1 text-xs w-full" value={editData.worship_type || ''} onChange={(e) => setEditData(p => ({ ...p, worship_type: e.target.value }))} /></td>
                    <td className="px-3 py-1.5"><input className="!py-1 text-xs w-full" value={editData.description || ''} onChange={(e) => setEditData(p => ({ ...p, description: e.target.value }))} /></td>
                    <td className="px-3 py-1.5"><input className="!py-1 text-xs w-full" value={editData.key || ''} onChange={(e) => setEditData(p => ({ ...p, key: e.target.value }))} /></td>
                    <td className="text-center px-4 py-2">
                      <span className="text-xs font-medium text-green-400">{item.status}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <button onClick={saveEdit} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded"><Check className="w-4 h-4" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{item.number}</td>
                    <td className="px-4 py-3 text-xs font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{item.version || '-'}</td>
                    <td className="px-4 py-3 text-xs">{item.celebration_type || '-'}</td>
                    <td className="px-4 py-3 text-xs">{item.vocal_type || '-'}</td>
                    <td className="px-4 py-3 text-xs">{item.worship_type || '-'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{item.description || '-'}</td>
                    <td className="px-4 py-3 text-xs">{item.key || '-'}</td>
                    <td className="text-center px-4 py-3">
                      <button onClick={() => toggleStatus(item)} className={`text-xs font-medium px-2.5 py-1 rounded ${item.status === 'ON' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {item.status}
                      </button>
                    </td>
                    <td className="px-2 py-3">
                      <button onClick={() => startEdit(item)} className="p-1.5 text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--accent)] rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-8 text-sm text-[var(--muted-foreground)]">Nenhum louvor encontrado.</p>
        )}
      </div>

      {/* Active filters indicator */}
      {(filterCelebration || filterVocal || filterWorship || filterStatus) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--muted-foreground)]">Filtros:</span>
          {filterCelebration && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded cursor-pointer" onClick={() => setFilterCelebration('')}>{filterCelebration} ×</span>}
          {filterVocal && <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded cursor-pointer" onClick={() => setFilterVocal('')}>{filterVocal} ×</span>}
          {filterWorship && <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded cursor-pointer" onClick={() => setFilterWorship('')}>{filterWorship} ×</span>}
          {filterStatus && <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded cursor-pointer" onClick={() => setFilterStatus('')}>{filterStatus} ×</span>}
          <button onClick={() => { setFilterCelebration(''); setFilterVocal(''); setFilterWorship(''); setFilterStatus('') }} className="text-xs text-red-400 ml-2">Limpar todos</button>
        </div>
      )}
    </div>
  )
}
