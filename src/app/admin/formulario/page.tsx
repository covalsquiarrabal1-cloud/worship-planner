'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2, ClipboardList } from 'lucide-react'

interface Ministry {
  id: string
  name: string
  slug: string
}

export default function AdminFormularioPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { loadMinistries() }, [])

  async function loadMinistries() {
    const res = await fetch('/api/ministries')
    if (res.ok) {
      const data = await res.json()
      setMinistries(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  function handleNameChange(value: string) {
    setNewName(value)
    setNewSlug(generateSlug(value))
  }

  async function addMinistry() {
    if (!newName.trim() || !newSlug.trim()) return

    setSaving(true)
    const res = await fetch('/api/ministries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
    })

    if (res.ok) {
      setNewName('')
      setNewSlug('')
      setShowAdd(false)
      loadMinistries()
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao adicionar ministério.')
    }
    setSaving(false)
  }

  async function deleteMinistry(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja excluir "${name}"?\n\nIsso removerá o ministério da lista do formulário.`)) return

    setDeleting(id)
    const res = await fetch(`/api/ministries?id=${id}`, { method: 'DELETE' })

    if (res.ok) {
      loadMinistries()
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao excluir ministério.')
    }
    setDeleting(null)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Formulário</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Gerencie os ministérios disponíveis para seleção no formulário público.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#58a6ff] text-white text-sm font-semibold hover:bg-[#4c94e0] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo
        </button>
      </div>

      {/* Link do formulário */}
      <div className="card p-4 flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-[#58a6ff]" />
        <div className="flex-1">
          <p className="text-sm font-medium">Link público do formulário:</p>
          <p className="text-xs text-[var(--muted-foreground)] break-all">
            {typeof window !== 'undefined' ? `${window.location.origin}/formulario` : '/formulario'}
          </p>
        </div>
        <button
          onClick={() => {
            const url = `${window.location.origin}/formulario`
            navigator.clipboard.writeText(url)
            alert('Link copiado!')
          }}
          className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs font-semibold hover:border-[#58a6ff] transition-colors"
        >
          Copiar
        </button>
      </div>

      {/* Adicionar novo */}
      {showAdd && (
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Novo Ministério</h3>
          <input
            type="text"
            placeholder="Nome do ministério"
            value={newName}
            onChange={e => handleNameChange(e.target.value)}
            className="w-full"
          />
          <input
            type="text"
            placeholder="Slug (gerado automaticamente)"
            value={newSlug}
            onChange={e => setNewSlug(e.target.value)}
            className="w-full text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={addMinistry}
              disabled={saving || !newName.trim()}
              className="px-4 py-2 rounded-xl bg-[#58a6ff] text-white text-sm font-semibold hover:bg-[#4c94e0] disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(''); setNewSlug('') }}
              className="px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm hover:border-[#58a6ff] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de ministérios */}
      <div className="space-y-2">
        <p className="text-sm text-[var(--muted-foreground)]">{ministries.length} ministérios cadastrados</p>
        {ministries.map(m => (
          <div key={m.id} className="card p-3 flex items-center justify-between">
            <div>
              <span className="font-medium text-sm">{m.name}</span>
              <span className="text-xs text-[var(--muted-foreground)] ml-2">/{m.slug}</span>
            </div>
            <button
              onClick={() => deleteMinistry(m.id, m.name)}
              disabled={deleting === m.id}
              className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="Excluir"
            >
              {deleting === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
