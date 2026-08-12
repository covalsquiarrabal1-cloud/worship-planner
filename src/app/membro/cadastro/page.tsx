'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, ChevronDown, Users } from 'lucide-react'

export default function CadastroStaffPage() {
  const [cadastro, setCadastro] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/relatorios/cadastro')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCadastro(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  const filtered = cadastro.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Cadastro</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Visualização dos membros cadastrados (somente leitura)</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full !pl-11"
        />
      </div>

      {/* Count */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Users className="w-4 h-4" />
        <span>{filtered.length} pessoas{search && ` (filtrado de ${cadastro.length})`}</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((person, idx) => (
          <div key={idx} className="card">
            <button
              onClick={() => setExpandedPerson(prev => prev === person.email ? null : person.email)}
              className="w-full flex items-center justify-between"
            >
              <div className="text-left">
                <p className="text-sm font-medium">{person.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{person.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#58a6ff] font-semibold">
                  {person.person_roles?.filter((r: string) => r !== 'Membro').length > 0
                    ? person.person_roles.filter((r: string) => r !== 'Membro').join(', ')
                    : person.ministries.length > 0
                      ? `${person.ministries.length} ${person.ministries.length === 1 ? 'Min.' : 'Min.'}`
                      : 'Membro'}
                </span>
                <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedPerson === person.email ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {expandedPerson === person.email && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3">
                {/* Dados pessoais */}
                {(person.phone || person.birth_date) && (
                  <div className="bg-[var(--accent)] rounded-xl p-3 space-y-2">
                    <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">Dados Pessoais</p>
                    <div className="grid grid-cols-2 gap-2">
                      {person.phone && <div className="flex items-center gap-2 text-xs">📱 {person.phone}</div>}
                      {person.birth_date && <div className="flex items-center gap-2 text-xs">🎂 {new Date(person.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>}
                    </div>
                  </div>
                )}

                {/* Funções */}
                {person.person_roles && person.person_roles.length > 0 && (
                  <div className="bg-[var(--accent)] rounded-xl p-3 space-y-2">
                    <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">Funções</p>
                    <div className="flex flex-wrap gap-1.5">
                      {person.person_roles.map((role: string, i: number) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-medium">{role}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ministérios */}
                {person.ministries && person.ministries.length > 0 && (
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
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="h-24" />
    </div>
  )
}
