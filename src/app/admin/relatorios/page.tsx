'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, BarChart3, ArrowLeft, ChevronDown, Search, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { getMinistryIcon3D } from '@/lib/ministry-icons'

interface MinistryStats {
  id: string
  name: string
  slug: string
  count: number
  leader_name: string | null
  members: string[]
}

interface MultiAreaMember {
  name: string
  areas: string[]
}

interface ReportData {
  worshipCount: number
  worshipMembers: string[]
  worshipLeaders: { name: string; role: string }[]
  ministryStats: MinistryStats[]
  totalUnique: number
  multiArea: MultiAreaMember[]
}

export default function RelatoriosPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedArea, setExpandedArea] = useState<string | null>(null)
  const [tab, setTab] = useState<'visao' | 'cadastro'>('visao')
  const [cadastro, setCadastro] = useState<any[]>([])
  const [cadastroLoading, setCadastroLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)
  const [editingPerson, setEditingPerson] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')

  useEffect(() => {
    fetch('/api/relatorios')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function loadCadastro() {
    setCadastroLoading(true)
    const res = await fetch('/api/relatorios/cadastro')
    if (res.ok) setCadastro(await res.json())
    setCadastroLoading(false)
  }

  function handleTabChange(newTab: 'visao' | 'cadastro') {
    setTab(newTab)
    if (newTab === 'cadastro' && cadastro.length === 0) loadCadastro()
  }

  async function saveEdit(oldEmail: string) {
    const res = await fetch('/api/relatorios/cadastro', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_email: oldEmail, new_name: editName, new_email: editEmail }),
    })
    if (res.ok) {
      setEditingPerson(null)
      loadCadastro()
    } else {
      alert('Erro ao salvar.')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  if (!data) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">Erro ao carregar relatórios.</div>
  }

  const totalMinistries = data.ministryStats.reduce((sum, m) => sum + m.count, 0)

  function toggleExpand(key: string) {
    setExpandedArea(prev => prev === key ? null : key)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin" className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold">Relatórios</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Visão geral dos membros</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1.5 flex gap-1 mt-4">
        <button
          onClick={() => handleTabChange('visao')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all text-center ${tab === 'visao' ? 'bg-[#58a6ff] text-white shadow-[0_2px_8px_rgba(88,166,255,0.3)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => handleTabChange('cadastro')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all text-center ${tab === 'cadastro' ? 'bg-[#58a6ff] text-white shadow-[0_2px_8px_rgba(88,166,255,0.3)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
        >
          Cadastro
        </button>
      </div>

      {tab === 'visao' && data && (
      <>

      {/* Resumo Geral */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-5">
          <p className="text-3xl font-bold text-[#58a6ff]">{data.totalUnique}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Total de Membros</p>
        </div>
        <div className="card text-center py-5">
          <p className="text-3xl font-bold text-green-400">{data.multiArea.length}</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Servem em +1 área</p>
        </div>
      </div>

      {/* Membros por Área */}
      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Membros por Área
        </h3>

        {/* Louvor */}
        <div className="card">
          <button
            onClick={() => toggleExpand('louvor')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
                <img src={getMinistryIcon3D('louvor')} alt="Louvor" className="w-6 h-6 object-contain" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium">Louvor</span>
                {data.worshipLeaders && data.worshipLeaders.length > 0 && (
                  <p className="text-[10px] text-[var(--muted-foreground)]">Líder: {data.worshipLeaders.map(l => l.name).join(', ')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#58a6ff]">{data.worshipCount}</span>
              <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedArea === 'louvor' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expandedArea === 'louvor' && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
              {data.worshipLeaders && data.worshipLeaders.map((leader, i) => (
                <p key={`leader-${i}`} className="text-xs font-medium text-yellow-400 py-0.5">{leader.name} (Líder)</p>
              ))}
              {data.worshipMembers.map((name, i) => (
                <p key={i} className="text-xs text-[var(--muted-foreground)] py-0.5">{name}</p>
              ))}
            </div>
          )}
        </div>

        {/* Ministries */}
        {data.ministryStats.map(m => (
          <div key={m.id} className="card">
            <button
              onClick={() => toggleExpand(m.slug)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
                  <img src={getMinistryIcon3D(m.slug)} alt={m.name} className="w-6 h-6 object-contain" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium">{m.name}</span>
                  {m.leader_name && (
                    <p className="text-[10px] text-[var(--muted-foreground)]">Líder: {m.leader_name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#58a6ff]">{m.count}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedArea === m.slug ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {expandedArea === m.slug && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
                {m.leader_name && (
                  <p className="text-xs font-medium text-yellow-400 py-0.5">{m.leader_name} (Líder)</p>
                )}
                {m.members.map((name, i) => (
                  <p key={i} className="text-xs text-[var(--muted-foreground)] py-0.5">{name}</p>
                ))}
                {m.members.length === 0 && (
                  <p className="text-xs text-[var(--muted-foreground)] italic">Nenhum membro cadastrado.</p>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="card flex items-center justify-between bg-[var(--accent)]">
          <span className="text-sm font-semibold">Total (com repetições)</span>
          <span className="text-sm font-bold">{data.worshipCount + totalMinistries}</span>
        </div>
      </section>

      {/* Membros em múltiplas áreas */}
      {data.multiArea.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Servem em mais de 1 área ({data.multiArea.length})
          </h3>

          {data.multiArea.map((m, idx) => (
            <div key={idx} className="card flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{m.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {m.areas.map((area, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff]">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-lg font-bold text-[#58a6ff] shrink-0 ml-3">
                {String(m.areas.length).padStart(2, '0')}
              </span>
            </div>
          ))}
        </section>
      )}

      <div className="h-24" />
      </>
      )}

      {tab === 'cadastro' && (
        <div className="space-y-4">
          {/* Botão cadastrar */}
          <CadastroSection
            cadastro={cadastro}
            cadastroLoading={cadastroLoading}
            search={search}
            setSearch={setSearch}
            expandedPerson={expandedPerson}
            setExpandedPerson={setExpandedPerson}
            editingPerson={editingPerson}
            setEditingPerson={setEditingPerson}
            editName={editName}
            setEditName={setEditName}
            editEmail={editEmail}
            setEditEmail={setEditEmail}
            saveEdit={saveEdit}
            onReload={loadCadastro}
          />
        </div>
      )}

    </div>
  )
}


interface CadastroSectionProps {
  cadastro: any[]
  cadastroLoading: boolean
  search: string
  setSearch: (s: string) => void
  expandedPerson: string | null
  setExpandedPerson: (s: string | null) => void
  editingPerson: string | null
  setEditingPerson: (s: string | null) => void
  editName: string
  setEditName: (s: string) => void
  editEmail: string
  setEditEmail: (s: string) => void
  saveEdit: (oldEmail: string) => void
  onReload: () => void
}

interface PersonRole {
  id: string
  name: string
}

function CadastroSection({
  cadastro, cadastroLoading, search, setSearch,
  expandedPerson, setExpandedPerson,
  editingPerson, setEditingPerson,
  editName, setEditName, editEmail, setEditEmail,
  saveEdit, onReload,
}: CadastroSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [roles, setRoles] = useState<PersonRole[]>([])
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ name: '', email: '', phone: '', birth_date: '', nickname: '', role_ids: [] as string[], ministry_ids: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [personRoles, setPersonRoles] = useState<Record<string, PersonRole[]>>({})
  const [filterNoRole, setFilterNoRole] = useState(false)
  useEffect(() => {
    fetch('/api/person-roles').then(r => r.json()).then(d => { if (Array.isArray(d)) setRoles(d) })
    fetch('/api/ministries').then(r => r.json()).then(d => { if (Array.isArray(d)) setMinistries(d.map((m: any) => ({ id: m.id, name: m.name }))) })
  }, [])

  async function loadPersonRoles(email: string) {
    const res = await fetch(`/api/person-roles/assign?email=${encodeURIComponent(email)}`)
    if (res.ok) {
      const data = await res.json()
      const roleNames = data.map((d: any) => d.person_roles).filter(Boolean)
      setPersonRoles(prev => ({ ...prev, [email]: roleNames }))
    }
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      alert('Nome e e-mail são obrigatórios')
      return
    }
    setSaving(true)

    try {
      // 1. Cadastrar na tabela ministry_signups (dados pessoais)
      const signupRes = await fetch('/api/relatorios/cadastro/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          birth_date: form.birth_date || null,
          nickname: form.nickname.trim() || null,
        }),
      })

      if (!signupRes.ok) {
        const data = await signupRes.json()
        alert(data.error || 'Erro ao cadastrar')
        setSaving(false)
        return
      }

      // 2. Atribuir funções
      if (form.role_ids.length > 0) {
        await fetch('/api/person-roles/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim().toLowerCase(), role_ids: form.role_ids }),
        })
      }

      // 3. Vincular ministérios
      if (form.ministry_ids.length > 0) {
        await fetch('/api/relatorios/cadastro/ministries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim().toLowerCase(), name: form.name.trim(), ministry_ids: form.ministry_ids }),
        })
      }

      setForm({ name: '', email: '', phone: '', birth_date: '', nickname: '', role_ids: [], ministry_ids: [] })
      setShowForm(false)
      onReload()
    } catch {
      alert('Erro de conexão')
    }

    setSaving(false)
  }

  function toggleRole(roleId: string) {
    setForm(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId],
    }))
  }

  function toggleMinistry(ministryId: string) {
    setForm(prev => ({
      ...prev,
      ministry_ids: prev.ministry_ids.includes(ministryId)
        ? prev.ministry_ids.filter(id => id !== ministryId)
        : [...prev.ministry_ids, ministryId],
    }))
  }

  return (
    <>
      {/* Botão cadastrar + busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full !pl-11"
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${
            showForm ? 'bg-red-500/20 text-red-400' : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Fechar' : 'Cadastrar'}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterNoRole(!filterNoRole)}
          className={`px-6 py-3 rounded-none text-sm font-medium transition-colors border ${
            filterNoRole
              ? 'bg-red-500/15 text-red-400 border-red-500/40'
              : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--muted-foreground)]'
          }`}
        >
          {filterNoRole ? '✓  ' : ''}Sem função/ministério
        </button>
      </div>

      {/* Formulário de cadastro */}
      {showForm && (
        <div className="card space-y-4">
          <h4 className="text-sm font-semibold">Nova Pessoa</h4>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nome completo *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="email"
              placeholder="E-mail *"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <input
              type="text"
              placeholder="Apelido (ex: João Silva)"
              value={form.nickname}
              onChange={e => setForm({ ...form, nickname: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="tel"
                placeholder="Telefone"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
              <input
                type="date"
                placeholder="Data de nascimento"
                value={form.birth_date}
                onChange={e => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>

            {/* Seleção de funções */}
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-2 block">Função(ões)</label>
              <div className="flex flex-wrap gap-2">
                {roles.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.role_ids.includes(role.id)
                        ? 'bg-[#58a6ff] text-white'
                        : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                    }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
              <Link href="/admin/funcoes" className="text-[10px] text-[#58a6ff] mt-2 inline-block">
                Gerenciar funções →
              </Link>
            </div>

            {/* Seleção de ministérios */}
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-2 block">Ministério(s)</label>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
                {ministries.map(ministry => (
                  <button
                    key={ministry.id}
                    type="button"
                    onClick={() => toggleMinistry(ministry.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      form.ministry_ids.includes(ministry.id)
                        ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                        : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                    }`}
                  >
                    {form.ministry_ids.includes(ministry.id) ? '✓ ' : ''}{ministry.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim() || !form.email.trim()}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 text-sm hover:bg-gray-100 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Cadastrar Pessoa
          </button>
        </div>
      )}

      {/* Lista de cadastrados */}
      {cadastroLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted-foreground)]">{cadastro.length} pessoas cadastradas</p>
          {cadastro
            .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
            .filter(p => !filterNoRole || (p.ministries.length === 0 && (!p.person_roles || p.person_roles.length === 0 || (p.person_roles.length === 1 && p.person_roles[0] === 'Membro'))))
            .map((person, idx) => (
            <div key={idx} className="card">
              {editingPerson === person.email ? (
                <EditPersonForm
                  person={person}
                  roles={roles}
                  personRoles={personRoles[person.email] || []}
                  onSave={async (data) => {
                    const res = await fetch('/api/relatorios/cadastro/register', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    })
                    if (res.ok) {
                      // Update roles
                      await fetch('/api/person-roles/assign', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: data.new_email || data.old_email, role_ids: data.role_ids }),
                      })
                      // Update ministries
                      if (data.ministry_ids) {
                        await fetch('/api/relatorios/cadastro/ministries', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: data.new_email || data.old_email, name: data.new_name, ministry_ids: data.ministry_ids }),
                        })
                      }
                      setEditingPerson(null)
                      onReload()
                    } else {
                      const d = await res.json()
                      alert(d.error || 'Erro ao salvar')
                    }
                  }}
                  onCancel={() => setEditingPerson(null)}
                  onDelete={async () => {
                    if (!confirm(`Excluir cadastro de "${person.name}"? Isso não pode ser desfeito.`)) return
                    const res = await fetch(`/api/relatorios/cadastro/register?email=${encodeURIComponent(person.email)}`, { method: 'DELETE' })
                    if (res.ok) {
                      setEditingPerson(null)
                      onReload()
                    } else {
                      const d = await res.json()
                      alert(d.error || 'Erro ao excluir')
                    }
                  }}
                />
              ) : (
                <>
                  <button
                    onClick={() => {
                      const next = expandedPerson === person.email ? null : person.email
                      setExpandedPerson(next)
                      if (next && !personRoles[person.email]) loadPersonRoles(person.email)
                    }}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium">{person.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{person.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#58a6ff] font-semibold">
                        {person.person_roles?.filter((r: string) => r !== 'Membro').length > 0
                          ? `Função: ${person.person_roles.filter((r: string) => r !== 'Membro').join(', ')}`
                          : person.ministries.length > 0
                            ? `${person.ministries.length} ${person.ministries.length === 1 ? 'Ministério' : 'Ministérios'}`
                            : person.person_roles?.includes('Membro')
                              ? 'Membro'
                              : 'Sem vínculo'
                        }
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedPerson === person.email ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {expandedPerson === person.email && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3">
                      {/* Dados pessoais */}
                      <div className="bg-[var(--accent)] rounded-xl p-3 space-y-2">
                        <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">Dados Pessoais</p>
                        <div className="grid grid-cols-2 gap-2">
                          {person.phone && (
                            <div className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                              <span>📱</span> {person.phone}
                            </div>
                          )}
                          {person.birth_date && (
                            <div className="flex items-center gap-2 text-xs text-[var(--foreground)]">
                              <span>🎂</span> {new Date(person.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Funções */}
                      <div className="bg-[var(--accent)] rounded-xl p-3 space-y-2">
                        <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">Funções</p>
                        <div className="flex flex-wrap gap-1.5">
                          {personRoles[person.email] && personRoles[person.email].length > 0
                            ? personRoles[person.email].map((role: PersonRole) => (
                                <span key={role.id} className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-medium">
                                  {role.name}
                                </span>
                              ))
                            : <span className="text-xs text-[var(--muted-foreground)] italic">Nenhuma função</span>
                          }
                        </div>
                      </div>

                      {/* Ministérios */}
                      <div className="bg-[var(--accent)] rounded-xl p-3 space-y-2">
                        <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">Ministérios</p>
                        <div className="divide-y divide-[var(--border)]">
                          {person.ministries.map((m: any, i: number) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2.5">
                              <span className="text-xs font-medium">{m.ministry_name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                m.role === 'lider' || m.role === 'ambos' ? 'bg-amber-500/20 text-amber-400' : 'bg-[#58a6ff]/20 text-[#58a6ff]'
                              }`}>
                                {m.role === 'ambos' ? 'Membro + Líder' : m.role === 'lider' ? 'Líder' : 'Membro'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingPerson(person.email)
                            if (!personRoles[person.email]) loadPersonRoles(person.email)
                          }}
                          className="flex-1 py-2 rounded-xl bg-[#58a6ff]/10 text-[#58a6ff] text-xs font-semibold hover:bg-[#58a6ff]/20 transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Excluir "${person.name}"? Isso não pode ser desfeito.`)) return
                            const res = await fetch(`/api/relatorios/cadastro/register?email=${encodeURIComponent(person.email)}`, { method: 'DELETE' })
                            if (res.ok) {
                              setExpandedPerson(null)
                              onReload()
                            } else {
                              const d = await res.json()
                              alert(d.error || 'Erro ao excluir')
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function EditPersonForm({ person, roles, personRoles, onSave, onCancel, onDelete }: {
  person: any
  roles: PersonRole[]
  personRoles: PersonRole[]
  onSave: (data: any) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(person.name || '')
  const [email, setEmail] = useState(person.email || '')
  const [nickname, setNickname] = useState(person.nickname || '')
  const [phone, setPhone] = useState(person.phone || '')
  const [birthDate, setBirthDate] = useState(person.birth_date ? person.birth_date.substring(0, 10) : '')
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(personRoles.map(r => r.id))
  const [selectedMinistryIds, setSelectedMinistryIds] = useState<string[]>(
    (person.ministries || []).map((m: any) => m.ministry_id).filter((id: string) => id !== 'louvor')
  )
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/ministries').then(r => r.json()).then(d => { if (Array.isArray(d)) setMinistries(d.map((m: any) => ({ id: m.id, name: m.name }))) })
  }, [])

  function toggleRole(roleId: string) {
    setSelectedRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    )
  }

  function toggleMinistry(ministryId: string) {
    setSelectedMinistryIds(prev =>
      prev.includes(ministryId) ? prev.filter(id => id !== ministryId) : [...prev, ministryId]
    )
  }

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      alert('Nome e e-mail são obrigatórios')
      return
    }
    setSaving(true)
    await onSave({
      old_email: person.email,
      new_name: name.trim(),
      new_email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      birth_date: birthDate || null,
      nickname: nickname.trim() || null,
      role_ids: selectedRoleIds,
      ministry_ids: selectedMinistryIds,
    })
    setSaving(false)
  }

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-3">
        <div>
          <label className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider block mb-1">Nome</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider block mb-1">E-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" type="email" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider block mb-1">Apelido (usado nas escalas)</label>
          <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Ex: João Silva" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider block mb-1">Telefone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefone" type="tel" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider block mb-1">Nascimento</label>
            <input value={birthDate} onChange={e => setBirthDate(e.target.value)} type="date" />
          </div>
        </div>

        {/* Funções */}
        <div>
          <label className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider block mb-2">Funções</label>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedRoleIds.includes(role.id)
                    ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40'
                    : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                }`}
              >
                {selectedRoleIds.includes(role.id) ? '✓ ' : ''}{role.name}
              </button>
            ))}
          </div>
        </div>

        {/* Ministérios */}
        <div>
          <label className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider block mb-2">Ministérios</label>
          <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
            {ministries.map(ministry => (
              <button
                key={ministry.id}
                type="button"
                onClick={() => toggleMinistry(ministry.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedMinistryIds.includes(ministry.id)
                    ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                    : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                }`}
              >
                {selectedMinistryIds.includes(ministry.id) ? '✓ ' : ''}{ministry.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-[#58a6ff] text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 text-[#8b949e] text-sm rounded-xl hover:bg-[var(--accent)]">
          Cancelar
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-full py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
      >
        🗑️ Excluir cadastro
      </button>
    </div>
  )
}
