'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2, ClipboardList, Users, ChevronDown, Clock } from 'lucide-react'

interface Ministry {
  id: string
  name: string
  slug: string
}

interface MinistryMember {
  name: string
  email: string
  role: string
}

interface MinistryStat {
  id: string
  name: string
  slug: string
  total: number
  members: MinistryMember[]
}

interface RecentSignup {
  id: string
  name: string
  email: string
  created_at: string
  ministry_count: number
}

interface OtherMinistrySignup {
  id: string
  name: string
  email: string
  other_ministry: string
  other_role: string | null
  created_at: string
}

interface Stats {
  totalSignups: number
  lastSignupDate: string | null
  ministryStats: MinistryStat[]
  recentSignups: RecentSignup[]
  otherMinistrySignups: OtherMinistrySignup[]
}

export default function AdminFormularioPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'visao' | 'gerenciar'>('visao')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newGroup, setNewGroup] = useState('Outros')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedMinistry, setExpandedMinistry] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [ministriesRes, statsRes] = await Promise.all([
      fetch('/api/ministries'),
      fetch('/api/signup/stats'),
    ])

    if (ministriesRes.ok) {
      const data = await ministriesRes.json()
      setMinistries(Array.isArray(data) ? data : [])
    }
    if (statsRes.ok) {
      setStats(await statsRes.json())
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
      body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim(), group_name: newGroup }),
    })
    if (res.ok) {
      setNewName('')
      setNewSlug('')
      setNewGroup('Outros')
      setShowAdd(false)
      loadData()
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao adicionar ministério.')
    }
    setSaving(false)
  }

  async function deleteMinistry(id: string, name: string) {
    if (!confirm(`Excluir "${name}"?\n\nIsso removerá o ministério da lista do formulário.`)) return
    setDeleting(id)
    const res = await fetch(`/api/ministries?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      loadData()
    } else {
      const data = await res.json()
      alert(data.error || 'Erro ao excluir.')
    }
    setDeleting(null)
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  const maxCount = stats?.ministryStats?.[0]?.total || 1

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Formulário</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Inscrições e ministérios do formulário público.</p>
        </div>
      </div>

      {/* Link do formulário */}
      <div className="card p-4 flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-[#58a6ff] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Link público:</p>
          <p className="text-xs text-[var(--muted-foreground)] truncate">
            {typeof window !== 'undefined' ? `${window.location.origin}/formulario` : '/formulario'}
          </p>
        </div>
        <button
          onClick={() => {
            const url = `${window.location.origin}/formulario`
            navigator.clipboard.writeText(url)
            alert('Link copiado!')
          }}
          className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs font-semibold hover:border-[#58a6ff] transition-colors flex-shrink-0"
        >
          Copiar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('visao')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'visao' ? 'bg-[#58a6ff] text-white' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setTab('gerenciar')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'gerenciar' ? 'bg-[#58a6ff] text-white' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'
          }`}
        >
          Gerenciar
        </button>
      </div>

      {tab === 'visao' && stats && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center py-5">
              <p className="text-3xl font-bold text-[#58a6ff]">{stats.totalSignups}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Inscrições</p>
            </div>
            <div className="card text-center py-5">
              <p className="text-3xl font-bold text-green-400">{stats.ministryStats.length}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Ministérios com inscritos</p>
            </div>
          </div>

          {stats.lastSignupDate && (
            <div className="card p-3 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Clock className="w-4 h-4" />
              <span>Última inscrição: {formatDate(stats.lastSignupDate)}</span>
            </div>
          )}

          {/* Por ministério */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Inscritos por Ministério
            </h3>

            {stats.ministryStats.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)] italic">Nenhuma inscrição ainda.</p>
            )}

            {stats.ministryStats.map(m => (
              <div key={m.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedMinistry(prev => prev === m.id ? null : m.id)}
                  className="w-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#58a6ff]">{m.total}</span>
                      <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedMinistry === m.id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  {/* Barra de proporção */}
                  <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#58a6ff] transition-all"
                      style={{ width: `${(m.total / maxCount) * 100}%` }}
                    />
                  </div>
                </button>

                {expandedMinistry === m.id && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5">
                    {m.members.map((member, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--muted-foreground)]">{member.name}</span>
                        <button
                          onClick={async () => {
                            const newRole = member.role === 'lider' ? 'membro' : 'lider'
                            const res = await fetch('/api/signup/update-role', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                signup_email: member.email,
                                ministry_id: m.id,
                                old_role: member.role,
                                new_role: newRole,
                              }),
                            })
                            if (res.ok) {
                              setStats(prev => {
                                if (!prev) return prev
                                return {
                                  ...prev,
                                  ministryStats: prev.ministryStats.map(ms =>
                                    ms.id === m.id
                                      ? { ...ms, members: ms.members.map((mb, idx) => idx === i ? { ...mb, role: newRole } : mb) }
                                      : ms
                                  ),
                                }
                              })
                            }
                          }}
                          className={`px-2 py-0.5 rounded-full font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                            member.role === 'lider' ? 'bg-amber-500/20 text-amber-400' : 'bg-[#58a6ff]/20 text-[#58a6ff]'
                          }`}
                        >
                          {member.role === 'lider' ? 'Líder' : 'Membro'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* Inscrições recentes */}
          {stats.recentSignups.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Inscrições Recentes
              </h3>

              {stats.recentSignups.map(s => (
                <div key={s.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDate(s.created_at)}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff] font-semibold">
                    {s.ministry_count} {s.ministry_count === 1 ? 'ministério' : 'ministérios'}
                  </span>
                </div>
              ))}
            </section>
          )}

          {/* Não encontraram o ministério */}
          {stats.otherMinistrySignups && stats.otherMinistrySignups.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="text-base">❓</span>
                Não encontraram o ministério ({stats.otherMinistrySignups.length})
              </h3>

              {stats.otherMinistrySignups.map(s => (
                <div key={s.id} className="card p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{formatDate(s.created_at)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 font-semibold">
                      {s.other_ministry}
                    </span>
                    {s.other_role && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]">
                        {s.other_role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{s.email}</p>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {tab === 'gerenciar' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#58a6ff] text-white text-sm font-semibold hover:bg-[#4c94e0] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo
            </button>
          </div>

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
              <select
                value={newGroup}
                onChange={e => setNewGroup(e.target.value)}
                className="w-full"
              >
                <option value="Integração">Integração</option>
                <option value="Culto">Culto</option>
                <option value="Esporte">Esporte</option>
                <option value="Comunidade">Comunidade</option>
                <option value="Espiritual">Espiritual</option>
                <option value="Operacional">Operacional</option>
                <option value="Alive">Alive</option>
                <option value="Comunicação">Comunicação</option>
                <option value="Administrativo">Administrativo</option>
                <option value="Outros">Outros</option>
              </select>
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
        </>
      )}
    </div>
  )
}
