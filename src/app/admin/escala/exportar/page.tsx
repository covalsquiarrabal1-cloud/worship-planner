'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileDown, FileSpreadsheet, Loader2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ExportEvent {
  event_date: string
  day_of_week: string
  week_number: number
  scale_type: { name: string } | null
  assignments: {
    role: string
    member: { name: string } | null
  }[]
}

export default function ExportarPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const [events, setEvents] = useState<ExportEvent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('schedule_events')
      .select(`
        event_date,
        day_of_week,
        week_number,
        scale_type:scale_types(name),
        assignments:schedule_assignments(
          role,
          member:members(name)
        )
      `)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date')

    setEvents((data as unknown as ExportEvent[]) || [])
    setLoading(false)
  }

  function exportCSV() {
    const header = 'Semana,Data,Dia,Culto,Vocal 1,Vocal 2,Vocal 3,Bateria,Guitarra,Baixo\n'
    const rows = events.map(ev => {
      const getRole = (role: string) => ev.assignments.find(a => a.role === role)?.member?.name || '-'
      return [
        ev.week_number,
        format(new Date(ev.event_date + 'T12:00:00'), 'dd/MM/yyyy'),
        ev.day_of_week,
        ev.scale_type?.name || '-',
        getRole('vocal_1'),
        getRole('vocal_2'),
        getRole('vocal_3'),
        getRole('bateria'),
        getRole('guitarra'),
        getRole('baixo'),
      ].join(',')
    }).join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `escala-${month}-${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })

    doc.setFontSize(18)
    doc.text('Worship Planner', 14, 20)
    doc.setFontSize(12)
    doc.text(`Escala - ${format(new Date(year, month - 1), "MMMM 'de' yyyy", { locale: ptBR })}`, 14, 28)

    const tableData = events.map(ev => {
      const getRole = (role: string) => ev.assignments.find(a => a.role === role)?.member?.name || '-'
      return [
        ev.week_number.toString(),
        format(new Date(ev.event_date + 'T12:00:00'), 'dd/MM'),
        ev.day_of_week,
        ev.scale_type?.name || '-',
        getRole('vocal_1'),
        getRole('vocal_2'),
        getRole('vocal_3'),
        getRole('bateria'),
        getRole('guitarra'),
        getRole('baixo'),
      ]
    })

    autoTable(doc, {
      startY: 35,
      head: [['Sem', 'Data', 'Dia', 'Culto', 'Vocal 1', 'Vocal 2', 'Vocal 3', 'Bateria', 'Guitarra', 'Baixo']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    })

    doc.save(`escala-${month}-${year}.pdf`)
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg bg-[var(--accent)]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Exportar Escala</h2>
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">
        {format(new Date(year, month - 1), "MMMM 'de' yyyy", { locale: ptBR })} — {events.length} eventos
      </p>

      <div className="space-y-3">
        <button
          onClick={exportPDF}
          className="card w-full flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <FileDown className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-medium">Exportar PDF</p>
            <p className="text-xs text-[var(--muted-foreground)]">Tabela formatada para impressão</p>
          </div>
        </button>

        <button
          onClick={exportCSV}
          className="card w-full flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="font-medium">Exportar CSV</p>
            <p className="text-xs text-[var(--muted-foreground)]">Para abrir no Excel ou Google Sheets</p>
          </div>
        </button>
      </div>
    </div>
  )
}
