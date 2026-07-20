'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, ArrowLeft, Edit2, Trash2, Music, Plus, X } from 'lucide-react'
import Link from 'next/link'

interface Assignment {
  id: string
  role: string
  member: { id: string; name: string } | null
}

interface Song {
  id: string
  order_num: number
  title: string
  version: string | null
  minister: string | null
  youtube_url: string | null
}

interface EventDetail {
  id: string
  event_date: string
  day_of_week: string
  week_number: number
  scale_type: { id: string; name: string; type: string } | null
  assignments: Assignment[]
  songs: Song[]
}

export default function EventDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSongForm, setShowSongForm] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadEvent()
  }, [id])

  async function loadEvent() {
    const { data } = await supabase
      .from('schedule_events')
      .select(`
        id,
        event_date,
        day_of_week,
        week_number,
        scale_type:scale_types(id, name, type),
        assignments:schedule_assignments(
          id,
          role,
          member:members(id, name)
        ),
        songs(id, order_num, title, version, minister, youtube_url)
      `)
      .eq('id', id)
      .single()

    setEvent(data as unknown as EventDetail)
    setLoading(false)
  }

  async function deleteEvent() {
    if (!confirm('Excluir este evento da escala?')) return
    await supabase.from('schedule_events').delete().eq('id', id)
    router.push('/admin')
  }

  const roleLabels: Record<string, string> = {
    vocal_1: 'Vocal 1 (Líder)',
    vocal_2: 'Vocal 2',
    vocal_3: 'Vocal 3',
    guitarra: 'Guitarra',
    baixo: 'Baixo',
    bateria: 'Bateria',
    teclado: 'Teclado',
    back: 'Back',
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  if (!event) {
    return <p className="text-center py-8 text-[var(--muted-foreground)]">Evento não encontrado.</p>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg bg-[var(--accent)]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-lg">{event.scale_type?.name || 'Evento'}</h2>
          <p className="text-sm text-[var(--muted-foreground)] capitalize">
            {event.day_of_week}, {format(new Date(event.event_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <button onClick={deleteEvent} className="p-2 text-red-400">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Assignments */}
      <section className="space-y-2">
        <h3 className="font-semibold text-sm text-[var(--muted-foreground)] uppercase tracking-wide">Equipe</h3>
        {event.assignments.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum membro atribuído.</p>
        ) : (
          <div className="space-y-1">
            {event.assignments
              .sort((a, b) => a.role.localeCompare(b.role))
              .map((assignment) => (
                <div key={assignment.id} className="card flex items-center justify-between py-3">
                  <span className="text-xs text-[var(--muted-foreground)]">{roleLabels[assignment.role] || assignment.role}</span>
                  <span className="font-medium">{assignment.member?.name || '-'}</span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Songs */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[var(--muted-foreground)] uppercase tracking-wide">Louvores</h3>
          <button
            onClick={() => setShowSongForm(true)}
            className="flex items-center gap-1 text-sm text-white"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        {event.songs.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum louvor cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {event.songs
              .sort((a, b) => a.order_num - b.order_num)
              .map((song) => (
                <div key={song.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{song.order_num}. {song.title}</p>
                      <div className="flex gap-2 text-xs text-[var(--muted-foreground)] mt-0.5">
                        {song.version && <span>{song.version}</span>}
                        {song.minister && <span>• {song.minister}</span>}
                      </div>
                    </div>
                    {song.youtube_url && (
                      <a
                        href={song.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-red-500/20 rounded-lg"
                      >
                        <Music className="w-4 h-4 text-red-400" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Song Form Modal */}
      {showSongForm && (
        <SongForm
          eventId={event.id}
          nextOrder={(event.songs.length || 0) + 1}
          onClose={() => setShowSongForm(false)}
          onSave={() => { setShowSongForm(false); loadEvent() }}
        />
      )}
    </div>
  )
}

function SongForm({
  eventId,
  nextOrder,
  onClose,
  onSave,
}: {
  eventId: string
  nextOrder: number
  onClose: () => void
  onSave: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    version: '',
    minister: '',
    youtube_url: '',
    order_num: nextOrder,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('songs').insert({
      event_id: eventId,
      ...form,
      version: form.version || null,
      minister: form.minister || null,
      youtube_url: form.youtube_url || null,
    })
    setLoading(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--card)] w-full max-w-md rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-semibold">Adicionar Louvor</h3>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Ordem</label>
            <input
              type="number"
              value={form.order_num}
              onChange={(e) => setForm({ ...form, order_num: parseInt(e.target.value) })}
              min={1}
              required
            />
          </div>
          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Nome do louvor"
              required
            />
          </div>
          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Versão / Artista</label>
            <input
              type="text"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              placeholder="Ex: Hillsong, Bethel..."
            />
          </div>
          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Ministro</label>
            <input
              type="text"
              value={form.minister}
              onChange={(e) => setForm({ ...form, minister: e.target.value })}
              placeholder="Quem vai ministrar"
            />
          </div>
          <div>
            <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Link YouTube</label>
            <input
              type="url"
              value={form.youtube_url}
              onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
              placeholder="https://youtube.com/..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  )
}
