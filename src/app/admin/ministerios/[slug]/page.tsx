'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, ArrowLeft, Users, FileDown, Pencil, Settings } from 'lucide-react'
import Link from 'next/link'

interface MinistryMember { id: string; name: string; email: string | null; is_blocked: boolean; role: string }
interface MinistryEvent {
  id: string; event_date: string; day_of_week: string; week_number: number;
  scale_name: string | null; num_celebrations: number;
  assignments: { id: string; celebration_number: number; role_name: string | null; member: { id: string; name: string; nickname: string | null } | null }[]
}
interface MinistryRole { id: string; name: string }

export default function MinistryPage() {
  const params = useParams()
  const slug = params.slug as string
  const [members, setMembers] = useState<MinistryMember[]>([])
  const [events, setEvents] = useState<MinistryEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'escala' | 'membros' | 'momentos'>('escala')
  const [showConfig, setShowConfig] = useState(false)
  const [scaleConfig, setScaleConfig] = useState<Record<string, number>>({})
  const [savingConfig, setSavingConfig] = useState(false)
  const [ministryRoles, setMinistryRoles] = useState<MinistryRole[]>([])
  const [newRoleName, setNewRoleName] = useState('')
  const [momentos, setMomentos] = useState<any[]>([])
  const [loadingMomentos, setLoadingMomentos] = useState(false)
  // Intercessão event config
  const [eventConfig, setEventConfig] = useState<Record<string, Record<string, number>>>({})
  const [repeatTorre, setRepeatTorre] = useState(true)
  const [swappingAssignment, setSwappingAssignment] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(false)

  async function loadMomentos() {
    // Handled by MomentosTab component
  }
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberIsMembro, setNewMemberIsMembro] = useState(true)
  const [newMemberIsLider, setNewMemberIsLider] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editIsMembro, setEditIsMembro] = useState(true)
  const [editIsLider, setEditIsLider] = useState(false)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => { loadData() }, [currentDate])

  async function loadData() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const [membersRes, eventsRes, configRes, rolesRes] = await Promise.all([
      fetch(`/api/ministries/${slug}/members`),
      fetch(`/api/ministries/${slug}/events?start=${start}&end=${end}`),
      fetch(`/api/ministries/${slug}/config`),
      fetch(`/api/ministries/${slug}/roles`),
    ])

    if (membersRes.ok) setMembers(await membersRes.json())
    if (eventsRes.ok) setEvents(await eventsRes.json())
    if (configRes.ok) {
      const configData = await configRes.json()
      const map: Record<string, number> = {}
      for (const c of configData) map[c.scale_name] = c.num_people
      setScaleConfig(map)
    }
    if (rolesRes.ok) setMinistryRoles(await rolesRes.json())

    // Load schedule publish status
    const schedRes = await fetch(`/api/ministries/${slug}/schedule-status?month=${month}&year=${year}`)
    if (schedRes.ok) {
      const schedData = await schedRes.json()
      setIsPublished(schedData.is_published || false)
    } else {
      setIsPublished(false)
    }

    // Load intercessão event config
    if (slug === 'intercessao' || slug === 'intercessao-alive') {
      const ecRes = await fetch(`/api/ministries/${slug}/event-config`)
      if (ecRes.ok) {
        const ecData = await ecRes.json()
        const map: Record<string, Record<string, number>> = {}
        for (const cfg of ecData) {
          if (!map[cfg.scale_name]) map[cfg.scale_name] = {}
          map[cfg.scale_name][cfg.role_type] = cfg.num_people
        }
        setEventConfig(map)
      }
    }

    setLoading(false)
  }

  async function saveConfig() {
    setSavingConfig(true)
    const entries = Object.entries(scaleConfig).filter(([_, v]) => v > 0)
    await fetch(`/api/ministries/${slug}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: entries.map(([scale_name, num_people]) => ({ scale_name, num_people })) }),
    })
    setSavingConfig(false)
    setShowConfig(false)
  }

  async function addMinistryRole() {
    if (!newRoleName.trim()) return
    const res = await fetch(`/api/ministries/${slug}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoleName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setMinistryRoles(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewRoleName('')
    } else {
      const d = await res.json()
      alert(d.error || 'Erro')
    }
  }

  async function deleteMinistryRole(id: string) {
    await fetch(`/api/ministries/${slug}/roles?id=${id}`, { method: 'DELETE' })
    setMinistryRoles(prev => prev.filter(r => r.id !== id))
  }

  async function updateAssignmentRole(assignmentId: string, roleName: string | null) {
    await fetch(`/api/ministries/${slug}/assignments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, roleName }),
    })
    setEvents(prev => prev.map(event => ({
      ...event,
      assignments: event.assignments.map(a =>
        a.id === assignmentId ? { ...a, role_name: roleName } : a
      ),
    })))
  }

  async function addMember() {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      alert('Nome e e-mail são obrigatórios.')
      return
    }
    if (!newMemberIsMembro && !newMemberIsLider) {
      alert('Selecione pelo menos uma função (Membro ou Líder).')
      return
    }
    const role = (newMemberIsMembro && newMemberIsLider) ? 'ambos' : newMemberIsLider ? 'lider' : 'membro'
    await fetch(`/api/ministries/${slug}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName.trim(), email: newMemberEmail.trim(), role }),
    })
    setNewMemberName('')
    setNewMemberEmail('')
    setNewMemberIsMembro(true)
    setNewMemberIsLider(false)
    setShowAddMember(false)
    loadData()
  }

  async function deleteMember(id: string) {
    if (!confirm('Remover este membro?')) return
    await fetch(`/api/ministries/${slug}/members?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  function startEdit(m: MinistryMember) {
    setEditingMember(m.id)
    setEditName(m.name)
    setEditEmail(m.email || '')
    setEditIsMembro(m.role === 'membro' || m.role === 'ambos')
    setEditIsLider(m.role === 'lider' || m.role === 'ambos')
  }

  async function saveEdit() {
    if (!editingMember || !editName.trim()) return
    const role = (editIsMembro && editIsLider) ? 'ambos' : editIsLider ? 'lider' : 'membro'
    await fetch(`/api/ministries/${slug}/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingMember, name: editName.trim(), email: editEmail.trim(), role }),
    })
    setEditingMember(null)
    loadData()
  }

  async function toggleMemberStatus(id: string, currentBlocked: boolean) {
    const res = await fetch(`/api/ministries/${slug}/members/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_blocked: !currentBlocked }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, is_blocked: !currentBlocked } : m))
    }
  }

  async function handleSwapMember(assignmentId: string, newMemberId: string) {
    if (!newMemberId) return

    setEvents(prev => prev.map(event => ({
      ...event,
      assignments: event.assignments.map(a =>
        a.id === assignmentId
          ? { ...a, member: members.find(m => m.id === newMemberId) ? { id: newMemberId, name: members.find(m => m.id === newMemberId)!.name, nickname: null } : a.member }
          : a
      ),
    })))

    const res = await fetch(`/api/ministries/${slug}/assignments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, memberId: newMemberId }),
    })

    if (!res.ok) {
      alert('Erro ao trocar membro. Recarregando...')
      loadData()
    }
  }

  async function handleAddMember(eventId: string, celebrationNumber: number, roleName: string, memberId: string) {
    const res = await fetch(`/api/ministries/${slug}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, memberId, celebrationNumber, roleName }),
    })
    if (res.ok) {
      const newAssignment = await res.json()
      const member = members.find(m => m.id === memberId)
      // Update state immediately
      setEvents(prev => prev.map(event =>
        event.id === eventId
          ? { ...event, assignments: [...event.assignments, { id: newAssignment.id, celebration_number: celebrationNumber, role_name: roleName, member: member ? { id: member.id, name: member.name, nickname: null } : null }] }
          : event
      ))
    } else {
      alert('Erro ao adicionar membro')
    }
  }

  async function handleRemoveMember(assignmentId: string) {
    // Update state immediately (optimistic)
    setEvents(prev => prev.map(event => ({
      ...event,
      assignments: event.assignments.filter(a => a.id !== assignmentId),
    })))

    const res = await fetch(`/api/ministries/${slug}/assignments?id=${assignmentId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      alert('Erro ao remover membro')
      loadData() // revert on error
    }
  }

  async function deleteSchedule() {
    if (!confirm('Excluir toda a escala deste mês?')) return
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return

    const res = await fetch(`/api/ministries/${slug}/delete-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    })

    if (res.ok) {
      setEvents([])
      alert('Escala excluída.')
    } else {
      const data = await res.json()
      alert('Erro: ' + (data.error || 'Erro desconhecido'))
    }
  }

  async function togglePublish() {
    const newStatus = !isPublished
    const res = await fetch(`/api/ministries/${slug}/schedule-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, is_published: newStatus }),
    })
    if (res.ok) {
      setIsPublished(newStatus)
    }
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    const monthName = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
    const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')

    doc.setFontSize(12)
    doc.text(`${title} - Escala`, doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' })
    doc.setFontSize(9)
    doc.text(monthName, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' })

    // Detect roles dynamically
    const allRoleNames = [...new Set(events.flatMap(e => e.assignments.map(a => a.role_name)).filter(Boolean))] as string[]
    const knownOrder = ['Torre', 'Intercessor', 'Coluna', 'Orar pelo Ministro', 'Suporte']
    const knownRoles = knownOrder.filter(r => allRoleNames.includes(r))
    const otherRoles = allRoleNames.filter(r => !knownOrder.includes(r)).sort()
    const pdfDisplayColumns = [...knownRoles, ...otherRoles]

    // Build table rows - track which rows belong to same event for merge
    const tableData: string[][] = []
    const mergeGroups: { startRow: number; endRow: number }[] = []

    for (const event of events) {
      const celebrations = Array.from({ length: event.num_celebrations }, (_, i) => i + 1)
      const dateStr = `${event.event_date.slice(8,10)}/${event.event_date.slice(5,7)}`
      const startRow = tableData.length

      for (let cIdx = 0; cIdx < celebrations.length; cIdx++) {
        const celNum = celebrations[cIdx]
        const celAssignments = event.assignments.filter(a => a.celebration_number === celNum)

        const row = [
          dateStr,
          event.day_of_week,
          event.scale_name || '-',
          event.num_celebrations > 1 ? `C${celNum}` : '-',
        ]

        for (const col of pdfDisplayColumns) {
          const colAssignments = celAssignments.filter(a => a.role_name === col)
          row.push(colAssignments.map(a => a.member?.nickname || a.member?.name || '-').join(', ') || '-')
        }

        tableData.push(row)
      }

      if (celebrations.length > 1) {
        mergeGroups.push({ startRow, endRow: tableData.length - 1 })
      }
    }

    const headColumns = ['Data', 'Dia', 'Escala', 'Cel.', ...pdfDisplayColumns.map(c => c === 'Intercessor' ? 'Intercessão' : c === 'Orar pelo Ministro' ? 'Orar p/ Ministro' : c)]

    autoTable(doc, {
      startY: 22,
      margin: { left: 5, right: 5, top: 5, bottom: 5 },
      head: [headColumns],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, lineWidth: 0.3, lineColor: [80, 80, 80], overflow: 'linebreak' },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 10, halign: 'center' },
      },
      didParseCell: (data: any) => {
        // For merged cells (Data, Dia, Escala - columns 0,1,2), hide text on non-first rows
        if (data.section === 'body' && data.column.index <= 2) {
          const rowIdx = data.row.index
          const group = mergeGroups.find(g => rowIdx > g.startRow && rowIdx <= g.endRow)
          if (group) {
            data.cell.text = ['']
          }
        }
      },
      didDrawCell: (data: any) => {
        // Remove top border for merged cells
        if (data.section === 'body' && data.column.index <= 2) {
          const rowIdx = data.row.index
          const group = mergeGroups.find(g => rowIdx > g.startRow && rowIdx <= g.endRow)
          if (group) {
            // Draw white line over the top border to hide it
            doc.setDrawColor(255, 255, 255)
            doc.setLineWidth(0.6)
            doc.line(data.cell.x + 0.3, data.cell.y, data.cell.x + data.cell.width - 0.3, data.cell.y)
            doc.setDrawColor(80, 80, 80)
            doc.setLineWidth(0.5)
          }
        }
      },
    })

    doc.save(`escala-${slug}-${month}-${year}.pdf`)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/ministerios" className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-bold capitalize">{slug.replace('-', ' ')}</h2>
      </div>

      {/* Tabs */}
      <div className={`grid gap-3 ${slug === 'intercessao-alive' ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <button
          onClick={() => setTab('escala')}
          className={`py-5 rounded-2xl text-sm font-semibold transition-all ${tab === 'escala' ? 'bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
        >
          📅 Escala
        </button>
        <button
          onClick={() => setTab('membros')}
          className={`py-5 rounded-2xl text-sm font-semibold transition-all ${tab === 'membros' ? 'bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
        >
          <Users className="w-4 h-4 inline mr-1" /> Membros ({members.length})
        </button>
        {slug === 'intercessao-alive' && (
          <button
            onClick={() => { setTab('momentos'); loadMomentos() }}
            className={`py-5 rounded-2xl text-sm font-semibold transition-all ${tab === 'momentos' ? 'bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
          >
            🕐 Momentos
          </button>
        )}
      </div>

      {tab === 'membros' ? (
        <div className="space-y-3">
          <button onClick={() => setShowAddMember(true)} className="flex items-center gap-2 bg-[#1c2128] border border-[#30363d] px-4 py-3 rounded-2xl text-sm hover:border-[#58a6ff]">
            <Plus className="w-4 h-4" /> Adicionar Membro
          </button>
          {showAddMember && (
            <div className="card space-y-3">
              <input placeholder="Nome" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} autoFocus />
              <input placeholder="E-mail (obrigatório)" type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewMemberIsMembro(!newMemberIsMembro)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    newMemberIsMembro
                      ? 'bg-[#58a6ff] text-white'
                      : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'
                  }`}
                >
                  Membro
                </button>
                <button
                  type="button"
                  onClick={() => setNewMemberIsLider(!newMemberIsLider)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    newMemberIsLider
                      ? 'bg-amber-500 text-white'
                      : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'
                  }`}
                >
                  Líder
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={addMember} className="flex-1 bg-[#58a6ff] text-white py-2 rounded-xl text-sm font-medium">Salvar</button>
                <button onClick={() => setShowAddMember(false)} className="px-4 py-2 text-[#8b949e] text-sm">Cancelar</button>
              </div>
            </div>
          )}
          {members.map(m => (
            <div key={m.id} className={`card ${m.is_blocked ? 'opacity-50' : ''}`}>
              {editingMember === m.id ? (
                <div className="space-y-3">
                  <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome" />
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="E-mail" type="email" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditIsMembro(!editIsMembro)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${editIsMembro ? 'bg-[#58a6ff] text-white' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
                    >
                      Membro
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsLider(!editIsLider)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${editIsLider ? 'bg-amber-500 text-white' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
                    >
                      Líder
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex-1 bg-[#58a6ff] text-white py-2 rounded-xl text-sm font-medium">Salvar</button>
                    <button onClick={() => setEditingMember(null)} className="px-4 py-2 text-[#8b949e] text-sm">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{m.name}</p>
                      {(m.role === 'lider' || m.role === 'ambos') && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-400">Líder</span>
                      )}
                      {(m.role === 'membro' || m.role === 'ambos') && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-[#58a6ff]/10 text-[#58a6ff]">Membro</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${m.is_blocked ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                        {m.is_blocked ? 'Inativo' : 'Ativo'}
                      </span>
                    </div>
                    {m.email && <p className="text-xs text-[var(--muted-foreground)]">{m.email}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(m)} className="p-2 text-[#58a6ff] hover:bg-[#58a6ff]/10 rounded-xl">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleMemberStatus(m.id, m.is_blocked)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${m.is_blocked ? 'text-green-400 hover:bg-green-500/10' : 'text-orange-400 hover:bg-orange-500/10'}`}
                    >
                      {m.is_blocked ? 'Ativar' : 'Inativar'}
                    </button>
                    <button onClick={() => deleteMember(m.id)} className="p-2 text-[#f85149] hover:bg-[#f85149]/10 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : tab === 'momentos' ? (
        <MomentosTab slug={slug} members={members} month={month} year={year} currentDate={currentDate} setCurrentDate={setCurrentDate} />
      ) : (
        <div className="space-y-4">
          {/* Month Nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-base font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className={`grid gap-3 ${(slug === 'intercessao' || slug === 'intercessao-alive') ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <Link
              href={`/admin/ministerios/${slug}/gerar?month=${month}&year=${year}`}
              className="flex flex-col items-center justify-center gap-2 bg-[#1c2128] border border-[#30363d] py-5 rounded-2xl hover:border-[#58a6ff] transition-colors"
            >
              <Plus className="w-5 h-5 text-[#58a6ff]" />
              <span className="text-xs font-semibold">GERAR</span>
            </Link>
            {(slug === 'intercessao' || slug === 'intercessao-alive') && (
              <Link
                href={`/admin/ministerios/${slug}/equipes`}
                className="flex flex-col items-center justify-center gap-2 bg-[#1c2128] border border-[#30363d] py-5 rounded-2xl hover:border-amber-400 transition-colors"
              >
                <Users className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-semibold">EQUIPES</span>
              </Link>
            )}
            <button
              onClick={() => setShowConfig(true)}
              className="flex flex-col items-center justify-center gap-2 bg-[#1c2128] border border-[#30363d] py-5 rounded-2xl hover:border-[#58a6ff] transition-colors"
            >
              <Settings className="w-5 h-5 text-[#58a6ff]" />
              <span className="text-xs font-semibold">CONFIG</span>
            </button>
            <button
              onClick={exportPDF}
              disabled={events.length === 0}
              className="flex flex-col items-center justify-center gap-2 bg-[#1c2128] border border-[#30363d] py-5 rounded-2xl hover:border-red-400 transition-colors disabled:opacity-40"
            >
              <FileDown className="w-5 h-5 text-red-400" />
              <span className="text-xs font-semibold">PDF</span>
            </button>
            <button
              onClick={togglePublish}
              disabled={events.length === 0}
              className={`flex flex-col items-center justify-center gap-2 bg-[#1c2128] border py-5 rounded-2xl transition-colors disabled:opacity-40 ${isPublished ? 'border-green-500/50 hover:border-orange-400' : 'border-[#30363d] hover:border-green-400'}`}
            >
              {isPublished ? (
                <>
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span className="text-xs font-semibold text-green-400">PUBLICADA</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  <span className="text-xs font-semibold text-orange-400">OCULTA</span>
                </>
              )}
            </button>
            <button
              onClick={deleteSchedule}
              disabled={events.length === 0}
              className="flex flex-col items-center justify-center gap-2 bg-[#1c2128] border border-[#30363d] py-5 rounded-2xl hover:border-[#f85149] transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-5 h-5 text-[#f85149]" />
              <span className="text-xs font-semibold">EXCLUIR</span>
            </button>
          </div>

          {/* Insert members button - shows when events exist but have few/no assignments */}
          {events.length > 0 && slug !== 'intercessao' && slug !== 'intercessao-alive' && (
            <button
              onClick={async () => {
                if (!confirm('Inserir membros automaticamente nos dias sem escala?')) return
                const res = await fetch(`/api/ministries/${slug}/auto-assign`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ month, year }),
                })
                if (res.ok) {
                  const result = await res.json()
                  alert(`✓ ${result.totalAssigned} membros inseridos!`)
                  loadData()
                } else {
                  const d = await res.json()
                  alert('Erro: ' + (d.error || 'Erro desconhecido'))
                }
              }}
              className="w-full py-3 rounded-xl bg-[#58a6ff] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#4c94e0] transition-colors"
            >
              <Users className="w-4 h-4" /> Inserir Membros
            </button>
          )}

          {/* Config modal */}
          {showConfig && (slug === 'intercessao' || slug === 'intercessao-alive') && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Configurar Escalas</h3>
                <button onClick={() => setShowConfig(false)} className="text-xs text-[var(--muted-foreground)]">✕</button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Defina quantas pessoas por função em cada tipo de evento.</p>

              {/* Header row */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-2 px-2 font-semibold">Evento</th>
                      <th className="py-2 px-2 text-center font-semibold text-amber-400">Torre</th>
                      <th className="py-2 px-2 text-center font-semibold text-blue-400">Intercessão</th>
                      <th className="py-2 px-2 text-center font-semibold text-red-400">Coluna</th>
                      <th className="py-2 px-2 text-center font-semibold text-green-400">Suporte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Get scale names from current month events + existing config
                      const scaleNamesFromEvents = [...new Set(events.map(e => e.scale_name).filter(Boolean))] as string[]
                      const scaleNamesFromConfig = Object.keys(eventConfig)
                      const allScaleNames = [...new Set([...scaleNamesFromEvents, ...scaleNamesFromConfig])].sort()

                      // Ensure new event types get default config
                      for (const name of scaleNamesFromEvents) {
                        if (!eventConfig[name]) {
                          eventConfig[name] = { torre: 1, intercessor: 2, coluna: 1, suporte: 2 }
                        }
                      }

                      return allScaleNames.map(scaleName => (
                        <tr key={scaleName} className="border-b border-[var(--border)]">
                          <td className="py-2 px-2 font-medium text-xs">{scaleName}</td>
                          {['torre', 'intercessor', 'coluna', 'suporte'].map(role => (
                            <td key={role} className="py-1 px-1 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setEventConfig(prev => {
                                    const copy = { ...prev, [scaleName]: { ...prev[scaleName] } }
                                    copy[scaleName][role] = Math.max(0, (copy[scaleName]?.[role] || 0) - 1)
                                    return copy
                                  })}
                                  className="w-6 h-6 rounded bg-[var(--accent)] border border-[var(--border)] text-xs font-bold"
                                >-</button>
                                <span className="w-5 text-center font-bold text-sm">{eventConfig[scaleName]?.[role] ?? 0}</span>
                                <button
                                  onClick={() => setEventConfig(prev => {
                                    const copy = { ...prev, [scaleName]: { ...prev[scaleName] } }
                                    copy[scaleName][role] = (copy[scaleName]?.[role] || 0) + 1
                                    return copy
                                  })}
                                  className="w-6 h-6 rounded bg-[var(--accent)] border border-[var(--border)] text-xs font-bold"
                                >+</button>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Repeat torre option */}
              <label className="flex items-center gap-3 cursor-pointer py-2">
                <div
                  onClick={() => setRepeatTorre(!repeatTorre)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    repeatTorre ? 'bg-amber-500 border-amber-500' : 'border-[var(--border)]'
                  }`}
                >
                  {repeatTorre && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium">Repetir líder de Torre nas 2 celebrações (C1 e C2 = mesmo Torre)</span>
              </label>

              <button
                onClick={async () => {
                  setSavingConfig(true)
                  const configs: any[] = []
                  for (const [scaleName, roles] of Object.entries(eventConfig)) {
                    for (const [roleType, numPeople] of Object.entries(roles)) {
                      configs.push({ scale_name: scaleName, role_type: roleType, num_people: numPeople, gender_filter: 'any' })
                    }
                  }
                  await fetch(`/api/ministries/${slug}/event-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ configs }),
                  })
                  setSavingConfig(false)
                  setShowConfig(false)
                }}
                disabled={savingConfig}
                className="w-full bg-[#58a6ff] text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-40"
              >
                {savingConfig ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>
          )}

          {showConfig && slug !== 'intercessao' && slug !== 'intercessao-alive' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Configurar Escalas</h3>
                <button onClick={() => setShowConfig(false)} className="text-xs text-[var(--muted-foreground)]">✕</button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Defina quantas pessoas escalar para cada tipo de culto/evento.</p>
              <div className="space-y-3">
                {/* Get unique scale names from existing events or scale_types */}
                {(() => {
                  const scaleNames = [...new Set(events.map(e => e.scale_name).filter(Boolean))] as string[]
                  // Also add any saved config names not in current events
                  for (const name of Object.keys(scaleConfig)) {
                    if (!scaleNames.includes(name)) scaleNames.push(name)
                  }
                  if (scaleNames.length === 0) {
                    return <p className="text-xs text-[var(--muted-foreground)] italic">Gere uma escala primeiro para configurar os tipos.</p>
                  }
                  return scaleNames.sort().map(name => (
                    <div key={name} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium flex-1">{name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setScaleConfig(prev => ({ ...prev, [name]: Math.max(1, (prev[name] || 1) - 1) }))}
                          className="w-8 h-8 rounded-lg bg-[var(--accent)] border border-[var(--border)] text-sm font-bold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{scaleConfig[name] || 1}</span>
                        <button
                          onClick={() => setScaleConfig(prev => ({ ...prev, [name]: (prev[name] || 1) + 1 }))}
                          className="w-8 h-8 rounded-lg bg-[var(--accent)] border border-[var(--border)] text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                })()}
              </div>
              <button
                onClick={saveConfig}
                disabled={savingConfig}
                className="w-full bg-[#58a6ff] text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-40"
              >
                {savingConfig ? 'Salvando...' : 'Salvar Configuração'}
              </button>

              {/* Funções do ministério */}
              <div className="border-t border-[var(--border)] pt-4 mt-4 space-y-3">
                <h4 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Funções deste Ministério</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova função (ex: Operador, Líder de sala...)"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMinistryRole())}
                    className="flex-1 !py-2 !text-xs"
                  />
                  <button onClick={addMinistryRole} disabled={!newRoleName.trim()} className="px-3 py-2 bg-[#58a6ff] text-white rounded-lg text-xs font-medium disabled:opacity-40">+</button>
                </div>
                {ministryRoles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ministryRoles.map(r => (
                      <span key={r.id} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent)] border border-[var(--border)] text-xs">
                        {r.name}
                        <button onClick={() => deleteMinistryRole(r.id)} className="text-red-400 hover:text-red-300 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Events */}
          {events.length === 0 ? (
            <div className="card text-center py-8 text-[var(--muted-foreground)]">
              <p className="text-sm">Nenhuma escala gerada para este mês.</p>
            </div>
          ) : (() => {
            // Detect all unique role_names to build dynamic columns
            const allRoleNames = [...new Set(events.flatMap(e => e.assignments.map(a => a.role_name)).filter(Boolean))] as string[]
            // Known order for specific roles, then others alphabetically
            const knownOrder = ['Torre', 'Intercessor', 'Coluna', 'Orar pelo Ministro', 'Suporte']
            const knownRoles = knownOrder.filter(r => allRoleNames.includes(r))
            const otherRoles = allRoleNames.filter(r => !knownOrder.includes(r)).sort()
            const displayColumns = [...knownRoles, ...otherRoles]

            const roleColors: Record<string, string> = {
              'Torre': 'text-amber-400',
              'Intercessor': 'text-white',
              'Coluna': 'text-red-400',
              'Orar pelo Ministro': 'text-blue-400',
              'Suporte': 'text-[var(--muted-foreground)]',
            }

            return (
            <div className="card p-0 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Data</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Dia</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Escala</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Cel.</th>
                    {displayColumns.map(col => (
                      <th key={col} className={`text-center px-3 py-2.5 text-xs font-semibold border-r border-[var(--border)] last:border-r-0 ${roleColors[col] || 'text-[var(--muted-foreground)]'}`}>
                        {col === 'Intercessor' ? 'Intercessão' : col === 'Orar pelo Ministro' ? 'Orar p/ Ministro' : col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => {
                    const celebrations = Array.from({ length: event.num_celebrations }, (_, i) => i + 1)
                    return celebrations.map((celNum, celIdx) => {
                      const celAssignments = event.assignments.filter(a => a.celebration_number === celNum)

                      return (
                        <tr key={`${event.id}-${celNum}`} className="border-b border-[var(--border)] hover:bg-[var(--accent)]/50">
                          {celIdx === 0 && (
                            <>
                              <td className="text-center px-3 py-2.5 text-xs font-medium border-r border-[var(--border)]" rowSpan={event.num_celebrations}>
                                {event.event_date.slice(8,10)}/{event.event_date.slice(5,7)}
                              </td>
                              <td className="text-center px-3 py-2.5 text-xs capitalize border-r border-[var(--border)]" rowSpan={event.num_celebrations}>
                                {event.day_of_week}
                              </td>
                              <td className="text-center px-3 py-2.5 text-xs font-semibold text-green-400 border-r border-[var(--border)]" rowSpan={event.num_celebrations}>
                                {event.scale_name || '-'}
                              </td>
                            </>
                          )}
                          <td className="text-center px-3 py-2.5 text-xs text-[var(--muted-foreground)] border-r border-[var(--border)]">
                            {event.num_celebrations > 1 ? `C${celNum}` : '-'}
                          </td>
                          {displayColumns.map(col => {
                            const colAssignments = celAssignments.filter(a => a.role_name === col)

                            return (
                              <td key={col} className="px-3 py-2.5 border-r border-[var(--border)] last:border-r-0">
                                <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                  {colAssignments.map((a, idx) => (
                                    swappingAssignment === a.id ? (
                                      <select
                                        key={a.id}
                                        autoFocus
                                        className="!py-0.5 !px-1 !text-xs !w-auto !min-w-[100px] !rounded"
                                        defaultValue={a.member?.id || ''}
                                        onChange={e => {
                                          handleSwapMember(a.id, e.target.value)
                                          setSwappingAssignment(null)
                                        }}
                                        onBlur={() => setSwappingAssignment(null)}
                                      >
                                        <option value="">— Selecionar —</option>
                                        {members.filter(m => !m.is_blocked).map(m => (
                                          <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span key={a.id} className="inline-flex items-center gap-0.5">
                                        <button
                                          onClick={() => setSwappingAssignment(a.id)}
                                          className={`text-xs font-medium hover:underline cursor-pointer ${roleColors[a.role_name || ''] || 'text-white'}`}
                                          title="Clique para trocar"
                                        >
                                          {a.member?.nickname || a.member?.name || '-'}{idx < colAssignments.length - 1 ? ',' : ''}
                                        </button>
                                        {colAssignments.length > 1 && (
                                          <button
                                            onClick={() => handleRemoveMember(a.id)}
                                            className="text-red-400 hover:text-red-300 text-sm font-bold w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10"
                                            title="Remover"
                                          >×</button>
                                        )}
                                      </span>
                                    )
                                  ))}
                                  {colAssignments.length === 0 && <span className="text-xs text-[var(--muted-foreground)]">-</span>}
                                  <button
                                    onClick={() => setSwappingAssignment(`add-${event.id}-${celNum}-${col}`)}
                                    className="text-[#58a6ff] text-sm font-bold hover:bg-[#58a6ff]/10 w-8 h-8 rounded-lg flex items-center justify-center"
                                    title="Adicionar membro"
                                  >+</button>
                                </div>
                                {swappingAssignment === `add-${event.id}-${celNum}-${col}` && (
                                  <select
                                    autoFocus
                                    className="!py-0.5 !px-1 !text-xs !w-full !rounded mt-1"
                                    defaultValue=""
                                    onChange={e => {
                                      if (e.target.value) handleAddMember(event.id, celNum, col, e.target.value)
                                      setSwappingAssignment(null)
                                    }}
                                    onBlur={() => setSwappingAssignment(null)}
                                  >
                                    <option value="">— Selecionar membro —</option>
                                    {members.filter(m => !m.is_blocked).map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function MomentosTab({ slug, members, month, year, currentDate, setCurrentDate }: {
  slug: string
  members: { id: string; name: string }[]
  month: number
  year: number
  currentDate: Date
  setCurrentDate: (d: Date) => void
}) {
  const [momentos, setMomentos] = useState<any[]>([])
  const [momentosMembers, setMomentosMembers] = useState<{ id: string; name: string; nickname: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [momentosPublished, setMomentosPublished] = useState(false)

  useEffect(() => { loadMomentos(); loadMembers() }, [month, year])

  async function loadMomentos() {
    setLoading(true)
    const res = await fetch(`/api/ministries/${slug}/momentos?month=${month}&year=${year}`)
    if (res.ok) setMomentos(await res.json())

    // Load publish status
    const pubRes = await fetch(`/api/ministries/${slug}/momentos/publish?month=${month}&year=${year}`)
    if (pubRes.ok) {
      const pubData = await pubRes.json()
      setMomentosPublished(pubData.is_published || false)
    }

    setLoading(false)
  }

  async function loadMembers() {
    const res = await fetch(`/api/ministries/${slug}/momentos-members`)
    if (res.ok) setMomentosMembers(await res.json())
  }

  async function addMember() {
    if (!newMemberName.trim()) return
    const res = await fetch(`/api/ministries/${slug}/momentos-members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName.trim(), auto_find_email: true }),
    })
    if (res.ok) {
      setNewMemberName('')
      loadMembers()
    }
  }

  async function removeMember(id: string) {
    if (!confirm('Remover este membro da lista de momentos?')) return
    await fetch(`/api/ministries/${slug}/momentos-members?id=${id}`, { method: 'DELETE' })
    loadMembers()
  }

  async function updateMember(id: string, memberId: string) {
    await fetch(`/api/ministries/${slug}/momentos`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, member_id: memberId || null }),
    })
    setMomentos(prev => prev.map(m => m.id === id ? { ...m, member_id: memberId || null, member: members.find(mb => mb.id === memberId) || null } : m))
  }

  async function generateMomentos() {
    setSaving(true)
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()}`

    // Get main schedule events for celebrations info AND conflict checking
    const eventsRes = await fetch(`/api/schedule-events?start=${start}&end=${end}`)
    let mainEvents: any[] = []
    if (eventsRes.ok) mainEvents = await eventsRes.json()

    // Build busy map from louvor schedule (email -> dates)
    const busyByDate: Record<string, Set<string>> = {}
    for (const ev of mainEvents) {
      if (ev.assignments) {
        for (const a of ev.assignments) {
          if (a.member?.email) {
            if (!busyByDate[ev.event_date]) busyByDate[ev.event_date] = new Set()
            busyByDate[ev.event_date].add(a.member.email.toLowerCase())
          }
        }
      }
    }

    // Load momentos members for auto-assignment
    const membersRes = await fetch(`/api/ministries/${slug}/momentos-members`)
    let mMembers: { id: string; name: string; nickname: string | null; email?: string }[] = []
    if (membersRes.ok) {
      const rawMembers = await membersRes.json()
      const seen = new Set<string>()
      for (const m of rawMembers) {
        const key = (m.nickname || m.name).toLowerCase().trim()
        if (!seen.has(key)) {
          seen.add(key)
          mMembers.push(m)
        }
      }
    }

    const newMomentos: any[] = []
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    // Collect all sundays
    const sundays: string[] = []
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) {
        sundays.push(`${year}-${String(month).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
      }
    }

    // Round-robin assignment: alternate members between Sobrenatural and Dízimos
    // Ensure different people for each momento on the same day
    // Skip members busy in louvor schedule
    let memberIndex = 0

    for (const dateStr of sundays) {
      const mainEvent = mainEvents.find((e: any) => e.event_date === dateStr)
      const cultoName = mainEvent?.scale_type?.name?.toLowerCase().includes('dois')
        ? 'Celebração Domingo (Dois Horários)'
        : 'Celebração Domingo'

      const busyEmails = busyByDate[dateStr] || new Set<string>()

      // Filter available members (not in louvor this day)
      const available = mMembers.filter(m => !m.email || !busyEmails.has(m.email.toLowerCase()))
      const pool = available.length > 0 ? available : mMembers // fallback if everyone is busy

      // Assign Sobrenatural
      const sobrenaturalMember = pool.length > 0
        ? pool[memberIndex % pool.length]
        : null
      memberIndex++

      // Assign Dízimos e Ofertas (next member, skip if same as sobrenatural)
      let dizimosMember = null
      if (pool.length > 1) {
        dizimosMember = pool[memberIndex % pool.length]
        if (dizimosMember?.id === sobrenaturalMember?.id) {
          memberIndex++
          dizimosMember = pool[memberIndex % pool.length]
        }
        memberIndex++
      } else if (pool.length === 1) {
        dizimosMember = pool[0]
      }

      newMomentos.push({
        event_date: dateStr,
        culto: cultoName,
        momento: 'Sobrenatural',
        member_id: sobrenaturalMember?.id || null,
      })
      newMomentos.push({
        event_date: dateStr,
        culto: cultoName,
        momento: 'Dízimos e Ofertas',
        member_id: dizimosMember?.id || null,
      })
    }

    await fetch(`/api/ministries/${slug}/momentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ momentos: newMomentos, month, year }),
    })

    await loadMomentos()
    setSaving(false)
  }

  async function addExtraDay(date: string, cultoName: string) {
    const newMomentos = [
      { event_date: date, culto: cultoName, momento: 'Sobrenatural', member_id: null },
      { event_date: date, culto: cultoName, momento: 'Dízimos e Ofertas', member_id: null },
    ]
    await fetch(`/api/ministries/${slug}/momentos/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ momentos: newMomentos }),
    })
    await loadMomentos()
  }

  return (
    <div className="space-y-4">
      {/* Month Nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Members management */}
      <div className="card space-y-3">
        <button onClick={() => setShowMembers(!showMembers)} className="text-sm font-semibold flex items-center gap-2">
          👥 Membros Momentos ({momentosMembers.length})
          <span className="text-[10px] text-[var(--muted-foreground)]">{showMembers ? '▲' : '▼'}</span>
        </button>
        {showMembers && (
          <div className="space-y-2">
            <MemberSearchAdd
              slug={slug}
              existingIds={momentosMembers.map(m => m.id)}
              onAdd={() => loadMembers()}
            />
            <div className="flex flex-wrap gap-1.5">
              {momentosMembers.map(m => (
                <span key={m.id} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent)] border border-[var(--border)] text-xs">
                  {m.nickname || m.name}
                  <button onClick={() => removeMember(m.id)} className="text-red-400 hover:text-red-300 ml-1">×</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      {momentos.length === 0 && !loading && (
        <button
          onClick={generateMomentos}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[#58a6ff] text-white font-semibold text-sm disabled:opacity-40"
        >
          {saving ? 'Gerando...' : 'Gerar Escala Momentos (Domingos)'}
        </button>
      )}

      {/* Actions when momentos exist */}
      {momentos.length > 0 && !loading && (
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={async () => {
              const newStatus = !momentosPublished
              const res = await fetch(`/api/ministries/${slug}/momentos/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, year, is_published: newStatus }),
              })
              if (res.ok) setMomentosPublished(newStatus)
            }}
            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-colors ${momentosPublished ? 'border-green-500/50 bg-[#1c2128]' : 'border-[#30363d] bg-[#1c2128]'}`}
          >
            {momentosPublished ? (
              <>
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <span className="text-[10px] font-semibold text-green-400">PUBLICADA</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                <span className="text-[10px] font-semibold text-orange-400">OCULTA</span>
              </>
            )}
          </button>
          <button
            onClick={generateMomentos}
            disabled={saving}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-[#30363d] bg-[#1c2128] hover:border-[#58a6ff] transition-colors"
          >
            <Plus className="w-4 h-4 text-[#58a6ff]" />
            <span className="text-[10px] font-semibold">REGERAR</span>
          </button>
          <button
            onClick={async () => {
              if (!confirm('Excluir toda a escala de Momentos deste mês?')) return
              await fetch(`/api/ministries/${slug}/momentos/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, year }),
              })
              setMomentos([])
            }}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-[#30363d] bg-[#1c2128] hover:border-[#f85149] transition-colors"
          >
            <Trash2 className="w-4 h-4 text-[#f85149]" />
            <span className="text-[10px] font-semibold text-[#f85149]">EXCLUIR</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : momentos.length > 0 && (
        <>
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Dia</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Culto</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Momento</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-[var(--muted-foreground)]">Escalado</th>
              </tr>
            </thead>
            <tbody>
              {momentos.map((m, idx) => {
                const prevMomento = idx > 0 ? momentos[idx - 1] : null
                const nextMomento = idx < momentos.length - 1 ? momentos[idx + 1] : null
                const isFirstOfGroup = !prevMomento || prevMomento.event_date !== m.event_date || prevMomento.culto !== m.culto
                const sameAsNext = nextMomento && nextMomento.event_date === m.event_date && nextMomento.culto === m.culto

                // Count how many rows share same date+culto
                let rowSpanCount = 1
                if (isFirstOfGroup) {
                  for (let i = idx + 1; i < momentos.length; i++) {
                    if (momentos[i].event_date === m.event_date && momentos[i].culto === m.culto) rowSpanCount++
                    else break
                  }
                }

                return (
                  <tr key={m.id} className="border-b border-[var(--border)] hover:bg-[var(--accent)]/50">
                    {isFirstOfGroup && (
                      <>
                        <td className="text-center px-3 py-2.5 text-xs font-medium border-r border-[var(--border)]" rowSpan={rowSpanCount}>
                          {m.event_date.slice(8,10)}/{m.event_date.slice(5,7)}
                        </td>
                        <td className="text-center px-3 py-2.5 text-xs font-semibold text-amber-400 border-r border-[var(--border)]" rowSpan={rowSpanCount}>
                          {m.culto}
                        </td>
                      </>
                    )}
                    <td className="text-center px-3 py-2.5 text-xs border-r border-[var(--border)]">
                      {m.momento || '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={m.member_id || ''}
                        onChange={(e) => updateMember(m.id, e.target.value)}
                        className="text-xs bg-[#1c2128] border border-[#30363d] rounded-lg px-2 py-1.5 text-white w-full"
                      >
                        <option value="">— Selecione —</option>
                        {momentosMembers.map(mb => (
                          <option key={mb.id} value={mb.id}>{mb.nickname || mb.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Add extra day */}
        <AddExtraDayButton
          month={month}
          year={year}
          existingDates={[...new Set(momentos.map(m => m.event_date))]}
          onAdd={addExtraDay}
        />
        </>
      )}
    </div>
  )
}

function AddExtraDayButton({ month, year, existingDates, onAdd }: {
  month: number; year: number; existingDates: string[]; onAdd: (date: string, culto: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [cultoName, setCultoName] = useState('')

  // Get available dates from main schedule that aren't already in momentos
  const [availableDates, setAvailableDates] = useState<{ date: string; dayOfWeek: string; scaleName: string }[]>([])

  useEffect(() => {
    async function loadDates() {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
      const res = await fetch(`/api/schedule-events?start=${start}&end=${end}`)
      if (res.ok) {
        const events = await res.json()
        const dates = events
          .filter((e: any) => !existingDates.includes(e.event_date))
          .map((e: any) => ({
            date: e.event_date,
            dayOfWeek: e.day_of_week,
            scaleName: e.scale_type?.name || e.day_of_week,
          }))
        setAvailableDates(dates)
      }
    }
    if (showForm) loadDates()
  }, [showForm])

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:border-[#58a6ff] hover:text-[#58a6ff] transition-colors flex items-center justify-center gap-2"
      >
        + Adicionar outro dia
      </button>
    )
  }

  return (
    <div className="card space-y-3">
      <p className="text-xs font-semibold">Adicionar dia à escala de Momentos</p>
      <select
        value={selectedDate}
        onChange={e => {
          setSelectedDate(e.target.value)
          const found = availableDates.find(d => d.date === e.target.value)
          if (found) setCultoName(found.scaleName || found.dayOfWeek)
        }}
        className="text-xs w-full"
      >
        <option value="">— Selecione um dia —</option>
        {availableDates.map(d => (
          <option key={d.date} value={d.date}>
            {d.date.slice(8,10)}/{d.date.slice(5,7)} - {d.dayOfWeek} ({d.scaleName})
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Nome do culto (ex: Alive, Conferência...)"
        value={cultoName}
        onChange={e => setCultoName(e.target.value)}
        className="!text-xs"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { if (selectedDate && cultoName) { onAdd(selectedDate, cultoName); setShowForm(false); setSelectedDate(''); setCultoName('') } }}
          disabled={!selectedDate || !cultoName}
          className="flex-1 py-2 bg-[#58a6ff] text-white rounded-xl text-xs font-medium disabled:opacity-40"
        >
          Adicionar
        </button>
        <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-[var(--muted-foreground)]">Cancelar</button>
      </div>
    </div>
  )
}

function MemberSearchAdd({ slug, existingIds, onAdd }: { slug: string; existingIds: string[]; onAdd: () => void }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ name: string; email: string; nickname: string | null }[]>([])
  const [allPeople, setAllPeople] = useState<{ name: string; email: string; nickname: string | null }[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) {
      fetch('/api/relatorios/cadastro')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAllPeople(data.map((p: any) => ({ name: p.name, email: p.email, nickname: p.nickname })))
          }
          setLoaded(true)
        })
    }
  }, [loaded])

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return }
    const q = search.toLowerCase()
    const filtered = allPeople.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.nickname && p.nickname.toLowerCase().includes(q)) ||
      p.email.toLowerCase().includes(q)
    ).slice(0, 8)
    setResults(filtered)
  }, [search, allPeople])

  async function selectPerson(person: { name: string; email: string; nickname: string | null }) {
    const res = await fetch(`/api/ministries/${slug}/momentos-members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: person.name, email: person.email, nickname: person.nickname }),
    })
    if (res.ok) {
      setSearch('')
      setResults([])
      onAdd()
    } else {
      const d = await res.json()
      alert(d.error || 'Erro ao adicionar')
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Pesquisar pessoa do cadastro..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="flex-1 !py-2 !text-xs w-full"
      />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map(p => (
            <button
              key={p.email}
              onClick={() => selectPerson(p)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--accent)] border-b border-[var(--border)] last:border-b-0"
            >
              <span className="font-medium">{p.nickname || p.name}</span>
              <span className="text-[var(--muted-foreground)] ml-2">{p.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
