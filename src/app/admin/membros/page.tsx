'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    const { data } = await supabase
      .from('members')
      .select('*')
      .order('name')
    setMembers(data || [])
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Membros</h2>
        <button
          onClick={() => { setEditingMember(null); setShowForm(true) }}
          className="flex items-center gap-1 bg-white text-black font-semibold px-3 py-2 rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Buscar membro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 py-2 text-sm"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'male', label: 'Homens' },
          { key: 'female', label: 'Mulheres' },
          { key: 'musician', label: 'Músicos' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              filter === f.key
                ? 'bg-white text-black font-medium'
                : 'bg-[var(--accent)] text-[var(--muted-foreground)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Members list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => { setEditingMember(member); setShowForm(true) }}
              className="card w-full text-left flex items-center gap-3"
            >
              <UserCircle className={`w-8 h-8 ${member.gender === 'male' ? 'text-blue-400' : 'text-pink-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{member.name}</span>
                  {member.is_leader && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                  {member.is_blocked && <Ban className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  {member.is_musician && (
                    <span className="flex items-center gap-0.5">
                      <Guitar className="w-3 h-3" />
                      {member.instrument}
                    </span>
                  )}
                  {member.is_back && <span className="bg-[var(--accent)] px-1.5 py-0.5 rounded">Back</span>}
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
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
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

    const payload = {
      ...form,
      instrument: form.is_musician ? form.instrument : null,
    }

    if (member) {
      await supabase.from('members').update(payload).eq('id', member.id)
    } else {
      await supabase.from('members').insert(payload)
    }

    setLoading(false)
    onSave()
  }

  async function handleDelete() {
    if (!member) return
    if (!confirm('Tem certeza que deseja excluir este membro?')) return
    await supabase.from('members').delete().eq('id', member.id)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--card)] w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-lg">
            {member ? 'Editar Membro' : 'Novo Membro'}
          </h3>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">E-mail (login)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="opcional"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Gênero</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, gender: 'male' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  form.gender === 'male' ? 'bg-blue-500 text-white' : 'bg-[var(--accent)]'
                }`}
              >
                Masculino
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, gender: 'female' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  form.gender === 'female' ? 'bg-pink-500 text-white' : 'bg-[var(--accent)]'
                }`}
              >
                Feminino
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_leader}
                onChange={(e) => setForm({ ...form, is_leader: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm">Líder de equipe</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_back}
                onChange={(e) => setForm({ ...form, is_back: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm">Back vocal</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_blocked}
                onChange={(e) => setForm({ ...form, is_blocked: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm flex items-center gap-1">
                <Ban className="w-4 h-4 text-red-400" />
                Bloqueado (não escalar)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_musician}
                onChange={(e) => setForm({ ...form, is_musician: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm">Músico</span>
            </label>
          </div>

          {form.is_musician && (
            <div>
              <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Instrumento</label>
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

          <div className="flex gap-2 pt-2">
            {member && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium text-sm"
              >
                Excluir
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
