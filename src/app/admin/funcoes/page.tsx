'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2, ArrowLeft, Tag } from 'lucide-react'
import Link from 'next/link'

interface PersonRole {
  id: string
  name: string
}

export default function FuncoesPage() {
  const [roles, setRoles] = useState<PersonRole[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadRoles()
  }, [])

  async function loadRoles() {
    const res = await fetch('/api/person-roles')
    if (res.ok) setRoles(await res.json())
    setLoading(false)
  }

  async function addRole() {
    if (!newName.trim()) return
    setAdding(true)

    const res = await fetch('/api/person-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })

    if (res.ok) {
      setNewName('')
      loadRoles()
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao adicionar')
    }

    setAdding(false)
  }

  async function deleteRole(id: string, name: string) {
    if (!confirm(`Excluir a função "${name}"? Isso remove a função de todas as pessoas.`)) return

    const res = await fetch(`/api/person-roles?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      loadRoles()
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao excluir')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/config" className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold">Funções</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Gerencie as funções das pessoas (Pastor, Ministro, etc.)</p>
        </div>
      </div>

      {/* Add new role */}
      <div className="card space-y-3">
        <label className="text-sm font-medium text-[var(--muted-foreground)] block">Nova função</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ex: Diácono, Presbítero..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
            className="flex-1"
          />
          <button
            onClick={addRole}
            disabled={!newName.trim() || adding}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-100 shrink-0 flex items-center gap-2"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      {/* Existing roles */}
      <div className="space-y-2">
        <p className="text-sm text-[var(--muted-foreground)]">{roles.length} funções cadastradas</p>
        {roles.map((role) => (
          <div key={role.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-[#58a6ff]" />
              <span className="text-sm font-medium">{role.name}</span>
            </div>
            <button
              onClick={() => deleteRole(role.id, role.name)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
