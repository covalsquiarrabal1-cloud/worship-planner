'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, UserCircle, Guitar, Ban, Crown, Loader2, X } from 'lucide-react'

interface Member {
  id: string
  name: string
  gender: 'male' | 'female'
  is_leader: boolean
  is_back: boolean
  is_blocked: boolean
  is_musician: boolean
  instrument: string | null
  email: string | null
}

export default function MembrosPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'male' | 'female' | 'musician'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    const res = await fetch('/api/members')
    const data = await res.json()
    setMembers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const filteredMembers = members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ||
      (filter === 'male' && m.gender === 'male') ||
      (filter === 'female' && m.gender === 'female') ||
      (filter === 'musician' && m.is_musician)
    return matchSearch && matchFilter
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Membros</h2>
        <button
          onClick={() => { setEditingMember(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-white text-black font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-gray-100"
        >
          <Plus className="w-4 h-4" />
          Novo
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Buscar membro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-with-icon"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'male', label: 'Homens' },
          { key: 'female', label: 'Mulheres' },
          { key: 'musician', label: 'Músicos' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'bg-white text-black font-medium'
                : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Members list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <p className="text-center text-sm text-[var(--muted-foreground)] py-12">
          Nenhum membro encontrado.
        </p>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => { setEditingMember(member); setShowForm(true) }}
              className="card w-full text-left flex items-center gap-4 hover:border-[#444] transition-colors"
            >
              <UserCircle className={`w-9 h-9 shrink-0 ${member.gender === 'male' ? 'text-blue-400' : 'text-pink-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium truncate">{member.name}</span>
                  {member.is_leader && <Crown className="w-4 h-4 text-yellow-400 shrink-0" />}
                  {member.is_blocked && <Ban className="w-4 h-4 text-red-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                  {member.is_musician && (
                    <span className="flex items-center gap-1">
                      <Guitar className="w-3.5 h-3.5" />
                      {member.instrument}
                    </span>
                  )}
                  {member.is_back && <span className="bg-[var(--accent)] px-2 py-0.5 rounded text-xs">Back</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Member Form Modal */}
      {showForm && (
        <MemberForm
          member={editingMember}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadMembers() }}
        />
      )}
    </div>
  )
}

function MemberForm({
  member,
  onClose,
  onSave,
}: {
  member: Member | null
  onClose: () => void
  onSave: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: member?.name || '',
    gender: member?.gender || 'male',
    is_leader: member?.is_leader || false,
    is_back: member?.is_back || false,
    is_blocked: member?.is_blocked || false,
    is_musician: member?.is_musician || false,
    instrument: member?.instrument || '',
    email: member?.email || '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      ...form,
      instrument: form.is_musician ? form.instrument : null,
    }

    let res: Response

    if (member) {
      res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, ...payload }),
      })
    } else {
      res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Erro ao salvar')
      setLoading(false)
      return
    }

    setLoading(false)
    onSave()
  }

  async function handleDelete() {
    if (!member) return
    if (!confirm('Tem certeza que deseja excluir este membro?')) return

    const res = await fetch(`/api/members?id=${member.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Erro ao excluir')
      return
    }
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[var(--card)] w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto border border-[var(--border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <h3 className="font-bold text-lg">
            {member ? 'Editar Membro' : 'Novo Membro'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">{error}</p>
          )}

          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-foreground)]">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Nome completo"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-foreground)]">E-mail (login)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="opcional"
            />
          </div>

          {/* Gênero */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-foreground)]">Gênero</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, gender: 'male' })}
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  form.gender === 'male'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                }`}
              >
                Masculino
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, gender: 'female' })}
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  form.gender === 'female'
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                    : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                }`}
              >
                Feminino
              </button>
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--muted-foreground)] mb-3 block">Funções</label>
            <div className="space-y-0">
              <label className="flex items-center gap-4 cursor-pointer py-3 px-1 rounded-lg hover:bg-[var(--accent)]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.is_leader}
                  onChange={(e) => setForm({ ...form, is_leader: e.target.checked })}
                />
                <span className="text-sm">Líder de equipe</span>
              </label>

              <label className="flex items-center gap-4 cursor-pointer py-3 px-1 rounded-lg hover:bg-[var(--accent)]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.is_back}
                  onChange={(e) => setForm({ ...form, is_back: e.target.checked })}
                />
                <span className="text-sm">Back vocal</span>
              </label>

              <label className="flex items-center gap-4 cursor-pointer py-3 px-1 rounded-lg hover:bg-[var(--accent)]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.is_blocked}
                  onChange={(e) => setForm({ ...form, is_blocked: e.target.checked })}
                />
                <span className="text-sm text-red-400">Bloqueado (não escalar)</span>
              </label>

              <label className="flex items-center gap-4 cursor-pointer py-3 px-1 rounded-lg hover:bg-[var(--accent)]/50 transition-colors">
                <input
                  type="checkbox"
                  checked={form.is_musician}
                  onChange={(e) => setForm({ ...form, is_musician: e.target.checked })}
                />
                <span className="text-sm">Músico</span>
              </label>
            </div>
          </div>

          {/* Instrumento */}
          {form.is_musician && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--muted-foreground)]">Instrumento</label>
              <select
                value={form.instrument}
                onChange={(e) => setForm({ ...form, instrument: e.target.value })}
              >
                <option value="">Selecione</option>
                <option value="guitarra">Guitarra</option>
                <option value="baixo">Baixo</option>
                <option value="bateria">Bateria</option>
                <option value="teclado">Teclado</option>
                <option value="violao">Violão</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            {member && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm hover:bg-red-500/20 transition-colors"
              >
                Excluir
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-white text-black font-semibold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center text-sm hover:bg-gray-100 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
