'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, BarChart3, ChevronDown, FileDown, FileSpreadsheet } from 'lucide-react'
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

export default function RelatoriosStaffPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedArea, setExpandedArea] = useState<string | null>(null)
  const [tab, setTab] = useState<'visao' | 'multi'>('visao')

  useEffect(() => {
    fetch('/api/relatorios')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  if (!data) return <div className="text-center py-12 text-[var(--muted-foreground)]">Erro ao carregar relatórios.</div>

  const totalMinistries = data.ministryStats.reduce((sum, m) => sum + m.count, 0)

  function toggleExpand(key: string) { setExpandedArea(prev => prev === key ? null : key) }

  async function exportVisaoExcel() {
    const XLSX = await import('xlsx')
    const rows: any[] = []
    for (const l of data!.worshipLeaders) rows.push({ Área: 'Louvor', Nome: l.name, Função: 'Líder' })
    for (const name of data!.worshipMembers) rows.push({ Área: 'Louvor', Nome: name, Função: 'Membro' })
    for (const m of data!.ministryStats) {
      if (m.leader_name) rows.push({ Área: m.name, Nome: m.leader_name, Função: 'Líder' })
      for (const name of m.members) rows.push({ Área: m.name, Nome: name, Função: 'Membro' })
    }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Visão Geral')
    XLSX.writeFile(wb, 'relatorio-visao-geral.xlsx')
  }

  async function exportVisaoPDF() {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Relatório - Visão Geral', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' })
    doc.setFontSize(9)
    doc.text(`Total: ${data!.totalUnique} membros`, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' })
    const rows: string[][] = []
    for (const l of data!.worshipLeaders) rows.push(['Louvor', l.name, 'Líder'])
    for (const name of data!.worshipMembers) rows.push(['Louvor', name, 'Membro'])
    for (const m of data!.ministryStats) {
      if (m.leader_name) rows.push([m.name, m.leader_name, 'Líder'])
      for (const name of m.members) rows.push([m.name, name, 'Membro'])
    }
    autoTable(doc, { startY: 22, head: [['Ministério', 'Nome', 'Função']], body: rows, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' } })
    doc.save('relatorio-visao-geral.pdf')
  }

  async function exportMultiExcel() {
    const XLSX = await import('xlsx')
    const rows = data!.multiArea.map(m => ({ Nome: m.name, Quantidade: m.areas.length, Ministérios: m.areas.join(', ') }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '+1 Ministério')
    XLSX.writeFile(wb, 'relatorio-mais-de-1-ministerio.xlsx')
  }

  async function exportMultiPDF() {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Servem em +1 Ministério', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' })
    doc.setFontSize(9)
    doc.text(`${data!.multiArea.length} pessoas`, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' })
    const rows = data!.multiArea.map(m => [m.name, String(m.areas.length), m.areas.join(', ')])
    autoTable(doc, { startY: 22, head: [['Nome', 'Qtd', 'Ministérios']], body: rows, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' }, columnStyles: { 1: { halign: 'center', cellWidth: 15 } } })
    doc.save('relatorio-mais-de-1-ministerio.pdf')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Relatórios</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Visão geral dos membros</p>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1.5 flex gap-1">
        <button onClick={() => setTab('visao')} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all text-center ${tab === 'visao' ? 'bg-[#58a6ff] text-white shadow-[0_2px_8px_rgba(88,166,255,0.3)]' : 'text-[var(--muted-foreground)]'}`}>
          Visão Geral
        </button>
        <button onClick={() => setTab('multi')} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all text-center ${tab === 'multi' ? 'bg-[#58a6ff] text-white shadow-[0_2px_8px_rgba(88,166,255,0.3)]' : 'text-[var(--muted-foreground)]'}`}>
          +1 Ministério ({data.multiArea.length})
        </button>
      </div>

      {/* Tab: Visão Geral */}
      {tab === 'visao' && (
      <>
      <div className="flex gap-2 justify-end">
        <button onClick={exportVisaoExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20">
          <FileSpreadsheet className="w-4 h-4" /> Excel
        </button>
        <button onClick={exportVisaoPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20">
          <FileDown className="w-4 h-4" /> PDF
        </button>
      </div>

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

      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Membros por Área</h3>

        <div className="card">
          <button onClick={() => toggleExpand('louvor')} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
                <img src={getMinistryIcon3D('louvor')} alt="Louvor" className="w-6 h-6 object-contain" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium">Louvor</span>
                {data.worshipLeaders && data.worshipLeaders.length > 0 && <p className="text-[10px] text-[var(--muted-foreground)]">Líder: {data.worshipLeaders.map(l => l.name).join(', ')}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#58a6ff]">{data.worshipCount}</span>
              <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedArea === 'louvor' ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {expandedArea === 'louvor' && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
              {data.worshipLeaders?.map((leader, i) => <p key={`l-${i}`} className="text-xs font-medium text-yellow-400 py-0.5">{leader.name} (Líder)</p>)}
              {data.worshipMembers.map((name, i) => <p key={i} className="text-xs text-[var(--muted-foreground)] py-0.5">{name}</p>)}
            </div>
          )}
        </div>

        {data.ministryStats.map(m => (
          <div key={m.id} className="card">
            <button onClick={() => toggleExpand(m.slug)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1c2128] border border-[#30363d] flex items-center justify-center">
                  <img src={getMinistryIcon3D(m.slug)} alt={m.name} className="w-6 h-6 object-contain" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium">{m.name}</span>
                  {m.leader_name && <p className="text-[10px] text-[var(--muted-foreground)]">Líder: {m.leader_name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#58a6ff]">{m.count}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedArea === m.slug ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {expandedArea === m.slug && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
                {m.leader_name && <p className="text-xs font-medium text-yellow-400 py-0.5">{m.leader_name} (Líder)</p>}
                {m.members.map((name, i) => <p key={i} className="text-xs text-[var(--muted-foreground)] py-0.5">{name}</p>)}
                {m.members.length === 0 && <p className="text-xs text-[var(--muted-foreground)] italic">Nenhum membro cadastrado.</p>}
              </div>
            )}
          </div>
        ))}

        <div className="card flex items-center justify-between bg-[var(--accent)]">
          <span className="text-sm font-semibold">Total (com repetições)</span>
          <span className="text-sm font-bold">{data.worshipCount + totalMinistries}</span>
        </div>
      </section>
      </>
      )}

      {/* Tab: +1 Ministério */}
      {tab === 'multi' && (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Users className="w-5 h-5" /> Servem em mais de 1 área ({data.multiArea.length})</h3>
          <div className="flex gap-2">
            <button onClick={exportMultiExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={exportMultiPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20">
              <FileDown className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
        {data.multiArea.length === 0 ? (
          <div className="card text-center py-8 text-[var(--muted-foreground)]"><p className="text-sm">Nenhum membro serve em mais de 1 área.</p></div>
        ) : data.multiArea.map((m, idx) => (
          <div key={idx} className="card flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">{m.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {m.areas.map((area, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff]">{area}</span>)}
              </div>
            </div>
            <span className="text-lg font-bold text-[#58a6ff] shrink-0 ml-3">{String(m.areas.length).padStart(2, '0')}</span>
          </div>
        ))}
      </section>
      )}

      <div className="h-24" />
    </div>
  )
}
