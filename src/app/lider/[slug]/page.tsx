'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, ArrowLeft, Users, Eye, EyeOff, FileDown } from 'lucide-react'
import Link from 'next/link'

interface MinistryMember { id: string; name: string; email: string | null; is_blocked: boolean }
interface MinistryEvent {
  id: string; event_date: string; day_of_week: string; week_number: number;
  scale_name: string | null; num_celebrations: number;
  assignments: { id: string; celebration_number: number; role_name: string | null; member: { id: string; name: string; nickname: string | null } | null }[]
}

export default function LiderMinistryPage() {
  const params = useParams()
  const slug = params.slug as string
  const [members, setMembers] = useState<MinistryMember[]>([])
  const [events, setEvents] = useState<MinistryEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'escala' | 'membros' | 'mensagens'>('escala')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [notifTitle, setNotifTitle] = useState('')
  const [notifBody, setNotifBody] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)
  const [swappingAssignment, setSwappingAssignment] = useState<string | null>(null)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => { loadData() }, [currentDate])

  async function loadData() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const [membersRes, eventsRes, pubRes] = await Promise.all([
      fetch(`/api/ministries/${slug}/members`),
      fetch(`/api/ministries/${slug}/events?start=${start}&end=${end}`),
      fetch(`/api/ministries/${slug}/publish-status?month=${month}&year=${year}`),
    ])

    if (membersRes.ok) setMembers(await membersRes.json())
    if (eventsRes.ok) setEvents(await eventsRes.json())
    if (pubRes.ok) {
      const pubData = await pubRes.json()
      setIsPublished(pubData.is_published ?? false)
    } else {
      setIsPublished(false)
    }
    setLoading(false)
  }

  async function addMember() {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      alert('Nome e e-mail são obrigatórios.')
      return
    }
    await fetch(`/api/ministries/${slug}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName.trim(), email: newMemberEmail.trim() }),
    })
    setNewMemberName('')
    setNewMemberEmail('')
    setShowAddMember(false)
    loadData()
  }

  async function deleteMember(id: string) {
    if (!confirm('Remover este membro?')) return
    await fetch(`/api/ministries/${slug}/members?id=${id}`, { method: 'DELETE' })
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

  async function togglePublish() {
    setPublishing(true)
    const res = await fetch(`/api/ministries/${slug}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    })
    if (res.ok) {
      const data = await res.json()
      setIsPublished(data.is_published)
      alert(data.is_published ? 'Escala publicada! Membros podem ver agora.' : 'Escala ocultada.')
    } else {
      const data = await res.json()
      alert('Erro: ' + (data.error || 'Erro desconhecido'))
    }
    setPublishing(false)
  }

  async function handleSwapMember(assignmentId: string, newMemberId: string) {
    if (!newMemberId) return
    const isEmpty = newMemberId === '__empty__'

    setEvents(prev => prev.map(event => ({
      ...event,
      assignments: event.assignments.map(a =>
        a.id === assignmentId
          ? { ...a, member: isEmpty ? null : (members.find(m => m.id === newMemberId) ? { id: newMemberId, name: members.find(m => m.id === newMemberId)!.name, nickname: null } : a.member) }
          : a
      ),
    })))

    const res = await fetch(`/api/ministries/${slug}/assignments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, memberId: isEmpty ? null : newMemberId }),
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
    setEvents(prev => prev.map(event => ({
      ...event,
      assignments: event.assignments.filter(a => a.id !== assignmentId),
    })))

    const res = await fetch(`/api/ministries/${slug}/assignments?id=${assignmentId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      alert('Erro ao remover membro')
      loadData()
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

    const allRoleNames = [...new Set(events.flatMap(e => e.assignments.map(a => a.role_name)).filter(Boolean))] as string[]
    const knownOrder = ['Torre', 'Intercessor', 'Coluna', 'Orar pelo Ministro', 'Suporte']
    const knownRoles = knownOrder.filter(r => allRoleNames.includes(r))
    const otherRoles = allRoleNames.filter(r => !knownOrder.includes(r)).sort()
    const pdfDisplayColumns = [...knownRoles, ...otherRoles]
    const hasNullRoles = events.some(e => e.assignments.some(a => !a.role_name && a.member))
    const showMembrosColumn = pdfDisplayColumns.length === 0 && hasNullRoles

    const tableData: string[][] = []
    for (const event of events) {
      const celebrations = Array.from({ length: event.num_celebrations }, (_, i) => i + 1)
      const dateStr = `${event.event_date.slice(8,10)}/${event.event_date.slice(5,7)}`
      for (const celNum of celebrations) {
        const celAssignments = event.assignments.filter(a => a.celebration_number === celNum)
        const row = [dateStr, event.day_of_week, event.scale_name || '-', event.num_celebrations > 1 ? `C${celNum}` : '-']
        if (showMembrosColumn) {
          row.push(celAssignments.filter(a => a.member).map(a => a.member?.nickname || a.member?.name || '-').join(', ') || '-')
        } else {
          for (const col of pdfDisplayColumns) {
            const colAssignments = celAssignments.filter(a => a.role_name === col)
            row.push(colAssignments.map(a => a.member?.nickname || a.member?.name || '-').join(', ') || '-')
          }
        }
        tableData.push(row)
      }
    }

    const headColumns = showMembrosColumn
      ? ['Data', 'Dia', 'Escala', 'Cel.', 'Membros']
      : ['Data', 'Dia', 'Escala', 'Cel.', ...pdfDisplayColumns.map(c => c === 'Intercessor' ? 'Intercessão' : c)]

    autoTable(doc, {
      startY: 22,
      margin: { left: 5, right: 5 },
      head: [headColumns],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold', fontSize: 7 },
    })

    doc.save(`escala-${slug}-${month}-${year}.pdf`)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/lider" className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-bold capitalize">{slug.replace('-', ' ')}</h2>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-3">
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
          <Users className="w-4 h-4 inline mr-1" /> Membros
        </button>
        <button
          onClick={() => setTab('mensagens')}
          className={`py-5 rounded-2xl text-sm font-semibold transition-all ${tab === 'mensagens' ? 'bg-[#58a6ff] text-white shadow-lg shadow-[#58a6ff]/20' : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e]'}`}
        >
          🔔 Notificar
        </button>
      </div>

      {tab === 'membros' && (
        <div className="space-y-3">
          <button onClick={() => setShowAddMember(true)} className="flex items-center gap-2 bg-[#1c2128] border border-[#30363d] px-4 py-3 rounded-2xl text-sm hover:border-[#58a6ff]">
            <Plus className="w-4 h-4" /> Adicionar Membro
          </button>
          {showAddMember && (
            <div className="card space-y-3">
              <input placeholder="Nome" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} autoFocus />
              <input placeholder="E-mail (obrigatório)" type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={addMember} className="flex-1 bg-[#58a6ff] text-white py-2 rounded-xl text-sm font-medium">Salvar</button>
                <button onClick={() => setShowAddMember(false)} className="px-4 py-2 text-[#8b949e] text-sm">Cancelar</button>
              </div>
            </div>
          )}
          {members.map(m => (
            <div key={m.id} className={`card flex items-center justify-between ${m.is_blocked ? 'opacity-50' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{m.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${m.is_blocked ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {m.is_blocked ? 'Inativo' : 'Ativo'}
                  </span>
                </div>
                {m.email && <p className="text-xs text-[var(--muted-foreground)]">{m.email}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
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
          ))}
        </div>
      )}

      {tab === 'mensagens' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h3 className="text-sm font-bold">🔔 Enviar Notificação Push</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Envia uma notificação para todos os membros do ministério que ativaram notificações no app.</p>
            <input
              type="text"
              placeholder="Título (ex: Escala publicada!)"
              value={notifTitle}
              onChange={e => setNotifTitle(e.target.value)}
            />
            <textarea
              placeholder="Mensagem (ex: Confira sua escala de agosto no app)"
              value={notifBody}
              onChange={e => setNotifBody(e.target.value)}
              rows={3}
              className="w-full resize-none"
            />
            <button
              onClick={async () => {
                if (!notifTitle.trim() || !notifBody.trim()) { alert('Título e mensagem são obrigatórios'); return }
                setSendingNotif(true)
                const res = await fetch('/api/push/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: notifTitle, body: notifBody, ministrySlug: slug, url: '/membro' }),
                })
                if (res.ok) {
                  const data = await res.json()
                  alert(`✓ Notificação enviada para ${data.sent} dispositivo(s)${data.failed > 0 ? ` (${data.failed} falharam)` : ''}`)
                  setNotifTitle('')
                  setNotifBody('')
                } else {
                  const data = await res.json()
                  alert('Erro: ' + (data.error || 'Erro desconhecido'))
                }
                setSendingNotif(false)
              }}
              disabled={sendingNotif || !notifTitle.trim() || !notifBody.trim()}
              className="w-full bg-[#58a6ff] text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {sendingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔔'} Enviar para Membros
            </button>
          </div>
        </div>
      )}

      {tab === 'escala' && (
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
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/lider/${slug}/gerar?month=${month}&year=${year}`}
              className="flex flex-col items-center justify-center gap-2 bg-[#1c2128] border border-[#30363d] py-5 rounded-2xl hover:border-[#58a6ff] transition-colors"
            >
              <Plus className="w-5 h-5 text-[#58a6ff]" />
              <span className="text-xs font-semibold">GERAR</span>
            </Link>
            <button
              onClick={exportPDF}
              disabled={events.length === 0}
              className="flex flex-col items-center justify-center gap-2 bg-[#1c2128] border border-[#30363d] py-5 rounded-2xl hover:border-red-400 transition-colors disabled:opacity-40"
            >
              <FileDown className="w-5 h-5 text-red-400" />
              <span className="text-xs font-semibold">PDF</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={togglePublish}
              disabled={publishing || events.length === 0}
              className={`flex flex-col items-center justify-center gap-2 border py-5 rounded-2xl transition-colors disabled:opacity-40 ${
                isPublished
                  ? 'bg-[#f85149]/10 border-[#f85149]/40 hover:border-[#f85149]'
                  : 'bg-[#1c2128] border-[#30363d] hover:border-green-500'
              }`}
            >
              {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : isPublished ? <EyeOff className="w-5 h-5 text-[#f85149]" /> : <Eye className="w-5 h-5 text-green-400" />}
              <span className="text-xs font-semibold">{isPublished ? 'OCULTAR' : 'PUBLICAR'}</span>
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

          {/* Events table */}
          {events.length === 0 ? (
            <div className="card text-center py-8 text-[var(--muted-foreground)]">
              <p className="text-sm">Nenhuma escala gerada para este mês.</p>
            </div>
          ) : (() => {
            const allRoleNames = [...new Set(events.flatMap(e => e.assignments.map(a => a.role_name || 'Membro')).filter(Boolean))] as string[]
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
            <div className="card p-0 overflow-x-auto border-2 border-[#30363d] rounded-xl">
              <table className="w-full text-sm border-collapse text-center">
                <thead>
                  <tr className="border-b-2 border-[var(--border)] bg-[var(--accent)]">
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Data</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Dia</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Escala</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Cel.</th>
                    {displayColumns.map(col => (
                      <th key={col} className={`text-center px-4 py-3 text-xs font-semibold border-r border-[var(--border)] last:border-r-0 ${roleColors[col] || 'text-[var(--muted-foreground)]'}`}>
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
                              <td className="text-center px-4 py-3 text-xs font-medium border-r border-[var(--border)]" rowSpan={event.num_celebrations}>
                                {event.event_date.slice(8,10)}/{event.event_date.slice(5,7)}
                              </td>
                              <td className="text-center px-4 py-3 text-xs capitalize border-r border-[var(--border)]" rowSpan={event.num_celebrations}>
                                {event.day_of_week}
                              </td>
                              <td className="text-center px-4 py-3 text-xs font-semibold text-green-400 border-r border-[var(--border)]" rowSpan={event.num_celebrations}>
                                {event.scale_name || '-'}
                              </td>
                            </>
                          )}
                          <td className="text-center px-4 py-3 text-xs text-[var(--muted-foreground)] border-r border-[var(--border)]">
                            {event.num_celebrations > 1 ? `C${celNum}` : '-'}
                          </td>
                          {displayColumns.map(col => {
                            const colAssignments = celAssignments.filter(a => (a.role_name || 'Membro') === col)

                            return (
                              <td key={col} className="px-2 py-1 border-r border-[var(--border)] last:border-r-0 text-center align-middle">
                                <div className="flex flex-col items-center">
                                  {colAssignments.map((a, idx) => (
                                    swappingAssignment === a.id ? (
                                      <div key={a.id} className={`py-2 w-full ${idx > 0 ? 'border-t border-[#30363d]' : ''}`}>
                                        <select
                                          autoFocus
                                          className="!py-0.5 !px-1 !text-xs !w-auto !min-w-[100px] !rounded mx-auto block"
                                          defaultValue={a.member?.id || ''}
                                          onChange={e => {
                                            handleSwapMember(a.id, e.target.value)
                                            setSwappingAssignment(null)
                                          }}
                                          onBlur={() => setSwappingAssignment(null)}
                                        >
                                          <option value="">— Selecionar —</option>
                                          <option value="__empty__">— Vazio —</option>
                                          {members.filter(m => !m.is_blocked).map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                          ))}
                                        </select>
                                      </div>
                                    ) : (
                                      <div key={a.id} className={`flex items-center justify-center gap-1 py-2 w-full ${idx > 0 ? 'border-t border-[#30363d]' : ''}`}>
                                        <button
                                          onClick={() => setSwappingAssignment(a.id)}
                                          className={`text-xs font-medium hover:underline cursor-pointer ${roleColors[a.role_name || ''] || 'text-white'}`}
                                          title="Clique para trocar"
                                        >
                                          {a.member?.nickname || a.member?.name || '-'}
                                        </button>
                                        <button
                                          onClick={() => handleRemoveMember(a.id)}
                                          className="text-red-400 hover:text-red-300 text-sm font-bold w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10"
                                          title="Remover"
                                        >×</button>
                                      </div>
                                    )
                                  ))}
                                  {colAssignments.length === 0 && <div className="py-2"><span className="text-xs text-[var(--muted-foreground)]">-</span></div>}
                                  <div className={`py-1.5 ${colAssignments.length > 0 ? 'border-t border-[#30363d]' : ''} w-full flex justify-center`}>
                                    <button
                                      onClick={() => setSwappingAssignment(`add-${event.id}-${celNum}-${col}`)}
                                      className="text-[#58a6ff] text-sm font-bold hover:bg-[#58a6ff]/10 w-6 h-6 rounded flex items-center justify-center"
                                      title="Adicionar membro"
                                    >+</button>
                                  </div>
                                </div>
                                {swappingAssignment === `add-${event.id}-${celNum}-${col}` && (
                                  <select
                                    autoFocus
                                    className="!py-0.5 !px-1 !text-xs !w-full !rounded mt-1"
                                    defaultValue=""
                                    onChange={e => {
                                      if (e.target.value) handleAddMember(event.id, celNum, col === 'Membro' ? '' : col, e.target.value)
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
