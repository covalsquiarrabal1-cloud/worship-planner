'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, BarChart3, ArrowLeft, ChevronDown, Search } from 'lucide-react'
import Link from 'next/link'

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

const ministryIcons: Record<string, string> = {
  'som': '🔊',
  'iluminacao': '💡',
  'projecao': '📽',
  'backstage': '🚪',
  'conexao': '🤝',
  'conexao-alive': '🤝',
  'excelencia': '⭐',
  'intercessao': '🙏',
  'intercessao-alive': '🙏',
  'centurioes': '🛡️',
  'servos': '🙌',
  'fotografia-creative': '📸',
  'stories': '📱',
  'profetico': '🔥',
  'kids': '🧒',
  'ac-soccer': '⚽',
  'ac-volei': '🏐',
  'decoracao': '🎨',
  'ativadas': '👩',
  'forja': '🔨',
  'empoderadas': '👑',
  'strong-brothers': '💪',
  'alive': '⚡',
  'sala-de-cura': '💊',
  'acao-social': '❤️',
  'financas': '💰',
  'bookstore': '📚',
  'exito': '🎯',
  'evangelismo': '📢',
  'membresia': '📋',
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
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => handleTabChange('visao')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors text-center ${tab === 'visao' ? 'bg-[#58a6ff] text-white' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => handleTabChange('cadastro')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors text-center ${tab === 'cadastro' ? 'bg-[#58a6ff] text-white' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'}`}
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
        <div className="card overflow-hidden">
          <button
            onClick={() => toggleExpand('louvor')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🎵</span>
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
                <p key={`leader-${i}`} className="text-xs font-medium text-yellow-400 py-0.5">👑 {leader.name} (Líder)</p>
              ))}
              {data.worshipMembers.map((name, i) => (
                <p key={i} className="text-xs text-[var(--muted-foreground)] py-0.5">{name}</p>
              ))}
            </div>
          )}
        </div>

        {/* Ministries */}
        {data.ministryStats.map(m => (
          <div key={m.id} className="card overflow-hidden">
            <button
              onClick={() => toggleExpand(m.slug)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{ministryIcons[m.slug] || '⛪'}</span>
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
                  <p className="text-xs font-medium text-yellow-400 py-0.5">👑 {m.leader_name} (Líder)</p>
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
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10"
            />
          </div>

          {cadastroLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-[var(--muted-foreground)]">{cadastro.length} pessoas cadastradas</p>
              {cadastro
                .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
                .map((person, idx) => (
                <div key={idx} className="card overflow-hidden">
                  {editingPerson === person.email ? (
                    <div className="space-y-3 p-1">
                      <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome" />
                      <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="E-mail" type="email" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(person.email)} className="flex-1 bg-[#58a6ff] text-white py-2 rounded-xl text-sm font-medium">Salvar</button>
                        <button onClick={() => setEditingPerson(null)} className="px-4 py-2 text-[#8b949e] text-sm">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpandedPerson(prev => prev === person.email ? null : person.email)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium">{person.name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{person.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#58a6ff] font-semibold">{person.ministries.length} min.</span>
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
                                  <span>🎂</span> {new Date(person.birth_date).toLocaleDateString('pt-BR')}
                                </div>
                              )}
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

                          <button
                            onClick={() => { setEditingPerson(person.email); setEditName(person.name); setEditEmail(person.email) }}
                            className="w-full py-2 rounded-xl bg-[#58a6ff]/10 text-[#58a6ff] text-xs font-semibold hover:bg-[#58a6ff]/20 transition-colors"
                          >
                            ✏️ Editar nome/email
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
