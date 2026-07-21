'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Search, X, Edit2, Check } from 'lucide-react'
import Link from 'next/link'

interface SetlistItem {
  id: string
  number: number
  title: string
  version: string | null
  worship_type: string | null
  description: string | null
  key: string | null
  status: string
}

export default function SetlistPage() {
  const [items, setItems] = useState<SetlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<SetlistItem>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ title: '', version: '', worship_type: '', description: '', key: '', status: 'ON' })
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
    setNewItem({ title: '', version: '', worship_type: '', description: '', key: '', status: 'ON' })
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
      worship_type: item.worship_type || '',
      description: item.description || '',
      key: item.key || '',
    })
  }

  const filtered = items.filter(item => {
    const q = search.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      (item.version || '').toLowerCase().includes(q) ||
      (item.worship_type || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    )
  })

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-bold">Set List ({items.length})</h2>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <input placeholder="Louvor *" value={newItem.title} onChange={(e) => setNewItem(p => ({ ...p, title: e.target.value }))} />
            <input placeholder="Versão" value={newItem.version} onChange={(e) => setNewItem(p => ({ ...p, version: e.target.value }))} />
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
              <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--muted-foreground)] w-10">#</th>
              <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--muted-foreground)]">Louvor</th>
              <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--muted-foreground)]">Versão</th>
              <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--muted-foreground)]">Tipo</th>
              <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--muted-foreground)]">Descrição</th>
              <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--muted-foreground)] w-14">Tom</th>
              <th className="text-center px-2 py-2 text-xs font-semibold text-[var(--muted-foreground)] w-14">Status</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className={`border-b border-[var(--border)] hover:bg-[var(--accent)]/50 ${item.status === 'OFF' ? 'opacity-40' : ''}`}>
                {editingId === item.id ? (
                  <>
                    <td className="px-2 py-1.5 text-xs">{item.number}</td>
                    <td className="px-1 py-1"><input className="!py-1 text-xs" value={editData.title || ''} onChange={(e) => setEditData(p => ({ ...p, title: e.target.value }))} /></td>
                    <td className="px-1 py-1"><input className="!py-1 text-xs" value={editData.version || ''} onChange={(e) => setEditData(p => ({ ...p, version: e.target.value }))} /></td>
                    <td className="px-1 py-1"><input className="!py-1 text-xs" value={editData.worship_type || ''} onChange={(e) => setEditData(p => ({ ...p, worship_type: e.target.value }))} /></td>
                    <td className="px-1 py-1"><input className="!py-1 text-xs" value={editData.description || ''} onChange={(e) => setEditData(p => ({ ...p, description: e.target.value }))} /></td>
                    <td className="px-1 py-1"><input className="!py-1 text-xs w-12" value={editData.key || ''} onChange={(e) => setEditData(p => ({ ...p, key: e.target.value }))} /></td>
                    <td className="text-center px-2 py-1.5">
                      <span className="text-xs font-medium text-green-400">{item.status}</span>
                    </td>
                    <td className="px-1 py-1">
                      <button onClick={saveEdit} className="p-1 text-green-400"><Check className="w-3.5 h-3.5" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-1.5 text-xs text-[var(--muted-foreground)]">{item.number}</td>
                    <td className="px-2 py-1.5 text-xs font-medium">{item.title}</td>
                    <td className="px-2 py-1.5 text-xs text-[var(--muted-foreground)]">{item.version || '-'}</td>
                    <td className="px-2 py-1.5 text-xs">{item.worship_type || '-'}</td>
                    <td className="px-2 py-1.5 text-xs text-[var(--muted-foreground)]">{item.description || '-'}</td>
                    <td className="px-2 py-1.5 text-xs">{item.key || '-'}</td>
                    <td className="text-center px-2 py-1.5">
                      <button onClick={() => toggleStatus(item)} className={`text-xs font-medium px-2 py-0.5 rounded ${item.status === 'ON' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {item.status}
                      </button>
                    </td>
                    <td className="px-1 py-1.5">
                      <button onClick={() => startEdit(item)} className="p-1 text-[var(--muted-foreground)] hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
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
    </div>
  )
}
