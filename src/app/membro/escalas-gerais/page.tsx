'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, FileDown } from 'lucide-react'
import { getMinistryIcon3D } from '@/lib/ministry-icons'

interface Ministry {
  id: string
  name: string
  slug: string
  group_name: string | null
}

interface MinistryEvent {
  id: string
  event_date: string
  day_of_week: string
  scale_name: string | null
  num_celebrations: number
  assignments: { id: string; celebration_number: number; role_name: string | null; member: { id: string; name: string; nickname: string | null } | null }[]
}

const GROUP_ORDER = ['Integração', 'Culto', 'Esporte', 'Comunidade', 'Espiritual', 'Operacional', 'Alive', 'Comunicação', 'Administrativo', 'Outros']

export default function EscalasGeraisStaffPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null)
  const [events, setEvents] = useState<MinistryEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [bgImage, setBgImage] = useState<string | null>(null)
  const [ministriesWithSchedule, setMinistriesWithSchedule] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadMinistries()
    loadBackground()
  }, [])

  useEffect(() => {
    if (ministries.length > 0) loadScheduleStatus()
  }, [ministries, currentDate])

  useEffect(() => {
    if (selectedMinistry) loadEvents()
  }, [selectedMinistry, currentDate])

  async function loadBackground() {
    const res = await fetch('/api/app-settings?key=escalas_gerais_bg')
    if (res.ok) {
      const data = await res.json()
      if (data.value) setBgImage(data.value)
    }
  }

  async function loadMinistries() {
    const res = await fetch('/api/ministries')
    if (res.ok) {
      const data = await res.json()
      // Add Louvor as a virtual ministry (it uses separate tables)
      const louvor = { id: 'louvor', name: 'Louvor', slug: 'louvor', group_name: 'Culto' }
      const all = Array.isArray(data) ? [louvor, ...data] : [louvor]
      setMinistries(all)
    }
    setLoading(false)
  }

  async function loadScheduleStatus() {
    const month = currentDate.getMonth() + 1
    const year = currentDate.getFullYear()
    const res = await fetch(`/api/ministries/schedule-status-all?month=${month}&year=${year}`)
    if (res.ok) {
      const data = await res.json()
      setMinistriesWithSchedule(new Set(data.ministryIds || []))
    }
  }

  async function loadEvents() {
    if (!selectedMinistry) return
    setLoadingEvents(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    if (selectedMinistry.slug === 'louvor') {
      // Louvor uses different API
      const res = await fetch(`/api/schedule-events?start=${start}&end=${end}`)
      if (res.ok) {
        const data = await res.json()
        // Transform louvor events to match MinistryEvent format
        const transformed = data.map((e: any) => ({
          id: e.id,
          event_date: e.event_date,
          day_of_week: e.day_of_week,
          scale_name: e.scale_type?.name || null,
          num_celebrations: 1,
          assignments: (e.assignments || []).map((a: any) => ({
            id: a.id,
            celebration_number: 1,
            role_name: a.role || 'Membro',
            member: a.member ? { id: a.member.id, name: a.member.name, nickname: a.member.nickname || null } : null,
          })),
        }))
        setEvents(transformed)
      } else {
        setEvents([])
      }
    } else {
      const res = await fetch(`/api/ministries/${selectedMinistry.slug}/events?start=${start}&end=${end}`)
      if (res.ok) setEvents(await res.json())
      else setEvents([])
    }
    setLoadingEvents(false)
  }

  async function exportPDF() {
    if (!selectedMinistry || events.length === 0) return
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    const monthName = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })

    doc.setFontSize(12)
    doc.text(`${selectedMinistry.name} - Escala`, doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' })
    doc.setFontSize(9)
    doc.text(monthName, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' })

    const allRoleNames = [...new Set(events.flatMap(e => e.assignments.map(a => a.role_name)).filter(Boolean))] as string[]
    const knownOrder = ['Torre', 'Intercessor', 'Coluna', 'Orar pelo Ministro', 'Suporte']
    const knownRoles = knownOrder.filter(r => allRoleNames.includes(r))
    const otherRoles = allRoleNames.filter(r => !knownOrder.includes(r)).sort()
    const pdfDisplayColumns = [...knownRoles, ...otherRoles]

    const tableData: string[][] = []

    for (const event of events) {
      const celebrations = Array.from({ length: event.num_celebrations }, (_, i) => i + 1)
      const dateStr = `${event.event_date.slice(8,10)}/${event.event_date.slice(5,7)}`

      for (const celNum of celebrations) {
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
    }

    const headColumns = ['Data', 'Dia', 'Escala', 'Cel.', ...pdfDisplayColumns]

    autoTable(doc, {
      startY: 22,
      margin: { left: 5, right: 5 },
      head: [headColumns],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 10, halign: 'center' },
      },
    })

    const month = currentDate.getMonth() + 1
    const year = currentDate.getFullYear()
    doc.save(`escala-${selectedMinistry.slug}-${month}-${year}.pdf`)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  // Detail view - schedule
  if (selectedMinistry) {
    const allRoleNames = [...new Set(events.flatMap(e => e.assignments.map(a => a.role_name)).filter(Boolean))] as string[]
    const knownOrder = ['Torre', 'Intercessor', 'Coluna', 'Orar pelo Ministro', 'Suporte']
    const knownRoles = knownOrder.filter(r => allRoleNames.includes(r))
    const otherRoles = allRoleNames.filter(r => !knownOrder.includes(r)).sort()
    const displayColumns = [...knownRoles, ...otherRoles]

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedMinistry(null)} className="p-2 rounded-xl bg-[#1c2128] border border-[#30363d]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
              <img src={getMinistryIcon3D(selectedMinistry.slug)} alt={selectedMinistry.name} className="w-7 h-7 object-contain" />
            </div>
            <h2 className="text-lg font-bold">{selectedMinistry.name}</h2>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d]">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Export PDF */}
        {events.length > 0 && (
          <button
            onClick={exportPDF}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1c2128] border border-[#30363d] hover:border-red-400 transition-colors"
          >
            <FileDown className="w-5 h-5 text-red-400" />
            <span className="text-sm font-semibold">Exportar PDF</span>
          </button>
        )}

        {/* Schedule table */}
        {loadingEvents ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="card text-center py-8 text-[var(--muted-foreground)]">
            <p className="text-sm">Nenhuma escala para este mês.</p>
          </div>
        ) : displayColumns.length > 0 ? (
          <div className="card p-0 overflow-x-auto border-2 border-[#30363d] rounded-xl">
            <table className="w-full text-sm border-collapse text-center">
              <thead>
                <tr className="border-b-2 border-[var(--border)] bg-[var(--accent)]">
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Data</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Dia</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Escala</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]">Cel.</th>
                  {displayColumns.map(col => (
                    <th key={col} className="text-center px-3 py-3 text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)] last:border-r-0">
                      {col === 'Intercessor' ? 'Intercessão' : col}
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
                      <tr key={`${event.id}-${celNum}`} className="border-b border-[var(--border)]">
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
                            <td key={col} className="px-3 py-2.5 text-xs border-r border-[var(--border)] last:border-r-0">
                              {colAssignments.length > 0
                                ? colAssignments.map(a => a.member?.nickname || a.member?.name || '-').join(', ')
                                : '-'
                              }
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
        ) : (
          /* Fallback for ministries without role columns */
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="card space-y-2">
                <div>
                  <span className="text-xs text-[var(--muted-foreground)] capitalize">{event.day_of_week}, {event.event_date.slice(8,10)}/{event.event_date.slice(5,7)}</span>
                  {event.scale_name && <span className="text-xs text-green-400 ml-2 font-medium">{event.scale_name}</span>}
                </div>
                <div className="space-y-1">
                  {event.assignments.sort((a, b) => a.celebration_number - b.celebration_number).map(a => (
                    <div key={a.id} className="flex items-center gap-2">
                      {event.num_celebrations > 1 && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">C{a.celebration_number}:</span>
                      )}
                      <span className="text-sm font-medium">{a.member?.nickname || a.member?.name || '-'}</span>
                      {a.role_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#58a6ff]/15 text-[#58a6ff] font-medium">{a.role_name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Ministry grid
  const groupMap: Record<string, Ministry[]> = {}
  for (const m of ministries) {
    const group = m.group_name || 'Outros'
    if (!groupMap[group]) groupMap[group] = []
    groupMap[group].push(m)
  }

  const groups = GROUP_ORDER
    .filter(g => groupMap[g] && groupMap[g].length > 0)
    .map(g => groupMap[g])

  const extraGroups = Object.keys(groupMap)
    .filter(g => !GROUP_ORDER.includes(g))
    .map(g => groupMap[g])
    .filter(g => g.length > 0)

  const allGroups = [...groups, ...extraGroups]

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h2 className="text-xl font-bold">Escalas Gerais</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Toque em um ministério para ver a escala.</p>
      </div>

      {/* Ministry grid with background */}
      <div className="relative rounded-2xl overflow-hidden">
        {bgImage ? (
          <div className="absolute inset-0">
            <img src={bgImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c2128] via-[#161b22] to-[#0d1117] border border-[var(--border)] rounded-2xl" />
        )}

        <div className="relative z-10 p-6">
          <div className="space-y-6">
            {allGroups.map((items, idx) => (
              <div key={idx} className="flex flex-wrap justify-center gap-4">
                {items.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMinistry(m)}
                    className="flex flex-col items-center gap-1.5 transition-all active:scale-90 hover:scale-105"
                  >
                    <div className={`relative w-[60px] h-[60px] rounded-[14px] flex items-center justify-center shadow-lg transition-all ${
                      ministriesWithSchedule.has(m.id)
                        ? 'glow-border-green'
                        : 'bg-[#1c2128]/80 border border-[#30363d]/60 hover:border-[#58a6ff]/50'
                    }`}>
                      {ministriesWithSchedule.has(m.id) && (
                        <div className="absolute inset-[-2px] rounded-[16px] animate-spin-slow" style={{
                          background: 'conic-gradient(from 0deg, transparent, #22c55e, #4ade80, transparent, #22c55e, transparent)',
                          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          maskComposite: 'xor',
                          WebkitMaskComposite: 'xor',
                          padding: '2px',
                          borderRadius: '16px',
                        }} />
                      )}
                      <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                        ministriesWithSchedule.has(m.id) ? 'bg-[#1c2128]' : ''
                      }`}>
                        <img
                          src={getMinistryIcon3D(m.slug)}
                          alt={m.name}
                          className="w-[36px] h-[36px] object-contain"
                        />
                      </div>
                    </div>
                    <span className={`text-[9px] text-center leading-tight font-medium w-[65px] break-words ${
                      ministriesWithSchedule.has(m.id) ? 'text-green-400' : 'text-[var(--muted-foreground)]'
                    }`}>
                      {m.name}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
