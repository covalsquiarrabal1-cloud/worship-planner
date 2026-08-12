'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, Plus, X, ChevronDown, FileDown, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

interface PersonRole {
  id: string
  name: string
}

export default function CadastroPage() {
  const [cadastro, setCadastro] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)
  const [editingPerson, setEditingPerson] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [roles, setRoles] = useState<PersonRole[]>([])
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ name: '', email: '', phone: '', birth_date: '', nickname: '', role_ids: [] as string[], ministry_ids: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [personRoles, setPersonRoles] = useState<Record<string, PersonRole[]>>({})
  const [filterNoRole, setFilterNoRole] = useState(false)

  useEffect(() => {
    loadCadastro()
    fetch('/api/person-roles').then(r => r.json()).then(d => { if (Array.isArray(d)) setRoles(d) })
    fetch('/api/ministries').then(r => r.json()).then(d => { if (Array.isArray(d)) setMinistries(d.map((m: any) => ({ id: m.id, name: m.name }))) })
  }, [])

  async function loadCadastro() {
    setLoading(true)
    const res = await fetch('/api/relatorios/cadastro')
    if (res.ok) setCadastro(await res.json())
    setLoading(false)
  }

  async function loadPersonRoles(email: string) {
    const res = await fetch(`/api/person-roles/assign?email=${encodeURIComponent(email)}`)
    if (res.ok) {
      const data = await res.json()
      const roleNames = data.map((d: any) => d.person_roles).filter(Boolean)
      setPersonRoles(prev => ({ ...prev, [email]: roleNames }))
    }
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) { alert('Nome e e-mail são obrigatórios'); return }
    setSaving(true)
    try {
      const signupRes = await fetch('/api/relatorios/cadastro/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim() || null, birth_date: form.birth_date || null, nickname: form.nickname.trim() || null }),
      })
      if (!signupRes.ok) { const d = await signupRes.json(); alert(d.error || 'Erro'); setSaving(false); return }
      if (form.role_ids.length > 0) {
        await fetch('/api/person-roles/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email.trim().toLowerCase(), role_ids: form.role_ids }) })
      }
      if (form.ministry_ids.length > 0) {
        await fetch('/api/relatorios/cadastro/ministries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email.trim().toLowerCase(), name: form.name.trim(), ministry_ids: form.ministry_ids }) })
      }
      setForm({ name: '', email: '', phone: '', birth_date: '', nickname: '', role_ids: [], ministry_ids: [] })
      setShowForm(false)
      loadCadastro()
    } catch { alert('Erro de conexão') }
    setSaving(false)
  }

  function toggleRole(roleId: string) { setForm(prev => ({ ...prev, role_ids: prev.role_ids.includes(roleId) ? prev.role_ids.filter(id => id !== roleId) : [...prev.role_ids, roleId] })) }
  function toggleMinistry(ministryId: string) { setForm(prev => ({ ...prev, ministry_ids: prev.ministry_ids.includes(ministryId) ? prev.ministry_ids.filter(id => id !== ministryId) : [...prev.ministry_ids, ministryId] })) }

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const rows = cadastro.map(p => ({
      Nome: p.name,
      Email: p.email,
      Telefone: p.phone || '',
      Nascimento: p.birth_date ? new Date(p.birth_date + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      Apelido: p.nickname || '',
      Funções: (p.person_roles || []).join(', '),
      Ministérios: (p.ministries || []).map((m: any) => m.ministry_name).join(', '),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cadastro')
    XLSX.writeFile(wb, 'cadastro.xlsx')
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Cadastro de Membros', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' })
    doc.setFontSize(9)
    doc.text(`${cadastro.length} pessoas`, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' })

    const rows = cadastro.map(p => [
      p.name,
      p.email,
      p.phone || '-',
      (p.person_roles || []).filter((r: string) => r !== 'Membro').join(', ') || 'Membro',
      (p.ministries || []).map((m: any) => m.ministry_name).join(', ') || '-',
    ])

    autoTable(doc, {
      startY: 22,
      head: [['Nome', 'Email', 'Telefone', 'Funções', 'Ministérios']],
      body: rows,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' },
    })
    doc.save('cadastro.pdf')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cadastro</h2>
        <div className="flex gap-2">
          <button onClick={exportExcel} disabled={cadastro.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-40">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} disabled={cadastro.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-40">
            <FileDown className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
          <input type="text" placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="w-full !pl-11" />
        </div>
        <button onClick={() => setShowForm(!showForm)} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shrink-0 transition-colors ${showForm ? 'bg-red-500/20 text-red-400' : 'bg-white text-black hover:bg-gray-100'}`}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Fechar' : 'Cadastrar'}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterNoRole(!filterNoRole)} className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors border ${filterNoRole ? 'bg-red-500/15 text-red-400 border-red-500/40' : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--muted-foreground)]'}`}>
          {filterNoRole ? '✓ ' : ''}Sem função/ministério
        </button>
      </div>

      {/* New person form */}
      {showForm && (
        <div className="card space-y-4">
          <h4 className="text-sm font-semibold">Nova Pessoa</h4>
          <div className="space-y-3">
            <input type="text" placeholder="Nome completo *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input type="email" placeholder="E-mail *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input type="text" placeholder="Apelido (ex: João Silva)" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input type="tel" placeholder="Telefone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <input type="date" placeholder="Nascimento" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-2 block">Função(ões)</label>
              <div className="flex flex-wrap gap-2">
                {roles.map(role => (
                  <button key={role.id} type="button" onClick={() => toggleRole(role.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.role_ids.includes(role.id) ? 'bg-[#58a6ff] text-white' : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}>
                    {role.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-2 block">Ministério(s)</label>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
                {ministries.map(ministry => (
                  <button key={ministry.id} type="button" onClick={() => toggleMinistry(ministry.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.ministry_ids.includes(ministry.id) ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40' : 'bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}>
                    {form.ministry_ids.includes(ministry.id) ? '✓ ' : ''}{ministry.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.email.trim()} className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 text-sm hover:bg-gray-100 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Cadastrar Pessoa
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted-foreground)]">{cadastro.length} pessoas cadastradas</p>
          {cadastro
            .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
            .filter(p => !filterNoRole || (p.ministries.length === 0 && (!p.person_roles || p.person_roles.length === 0 || (p.person_roles.length === 1 && p.person_roles[0] === 'Membro'))))
            .map((person, idx) => (
            <div key={idx} className="card">
              <button onClick={() => { const next = expandedPerson === person.email ? null : person.email; setExpandedPerson(next); if (next && !personRoles[person.email]) loadPersonRoles(person.email) }} className="w-full flex items-center justify-between">
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
                        : person.person_roles?.includes('Membro') ? 'Membro' : 'Sem vínculo'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedPerson === person.email ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {expandedPerson === person.email && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3">
                  <div className="bg-[var(--accent)] rounded-xl p-3 space-y-2">
                    <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">Dados Pessoais</p>
                    <div className="grid grid-cols-2 gap-2">
                      {person.phone && <div className="flex items-center gap-2 text-xs">📱 {person.phone}</div>}
                      {person.birth_date && <div className="flex items-center gap-2 text-xs">🎂 {new Date(person.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>}
                    </div>
                  </div>
                  <div className="bg-[var(--accent)] rounded-xl p-3 space-y-2">
                    <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">Funções</p>
                    <div className="flex flex-wrap gap-1.5">
                      {personRoles[person.email] && personRoles[person.email].length > 0
                        ? personRoles[person.email].map((role: PersonRole) => (<span key={role.id} className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 font-medium">{role.name}</span>))
                        : <span className="text-xs text-[var(--muted-foreground)] italic">Nenhuma função</span>}
                    </div>
                  </div>
                  <div className="bg-[var(--accent)] rounded-xl p-3 space-y-2">
                    <p className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] tracking-wider">Ministérios</p>
                    <div className="divide-y divide-[var(--border)]">
                      {person.ministries.map((m: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2.5">
                          <span className="text-xs font-medium">{m.ministry_name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.role === 'lider' || m.role === 'ambos' ? 'bg-amber-500/20 text-amber-400' : 'bg-[#58a6ff]/20 text-[#58a6ff]'}`}>
                            {m.role === 'ambos' ? 'Membro + Líder' : m.role === 'lider' ? 'Líder' : 'Membro'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/cadastro/${encodeURIComponent(person.email)}`} className="flex-1 py-2 rounded-xl bg-[#58a6ff]/10 text-[#58a6ff] text-xs font-semibold hover:bg-[#58a6ff]/20 transition-colors text-center">
                      ✏️ Editar
                    </Link>
                    <button onClick={async () => {
                      if (!confirm(`Excluir "${person.name}"?`)) return
                      const res = await fetch(`/api/relatorios/cadastro/register?email=${encodeURIComponent(person.email)}`, { method: 'DELETE' })
                      if (res.ok) { setExpandedPerson(null); loadCadastro() } else { const d = await res.json(); alert(d.error || 'Erro') }
                    }} className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors">
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="h-24" />
    </div>
  )
}
