'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, ArrowLeft, Trash2, Plus, X, Play, Music2, ExternalLink } from 'lucide-react'

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
  spotify_url: string | null
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
        songs(id, order_num, title, version, minister, youtube_url, spotify_url)
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

  async function deleteSong(songId: string) {
    if (!confirm('Excluir este louvor?')) return
    await supabase.from('songs').delete().eq('id', songId)
    loadEvent()
  }

  const roleLabels: Record<string, string> = {
    vocal_1: 'Vocal 1',
    vocal_2: 'Vocal 2',
    vocal_3: 'Vocal 3',
    guitarra: 'Guitarra',
    violao: 'Violão',
    baixo: 'Baixo',
    bateria: 'Bateria',
    teclado: 'Teclado',
    back: 'Back',
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  if (!event) {
    return <p className="text-center py-8 text-[var(--muted-foreground)]">Evento não encontrado.</p>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-lg">{event.scale_type?.name || 'Evento'}</h2>
          <p className="text-sm text-[var(--muted-foreground)] capitalize">
            {event.day_of_week}, {format(new Date(event.event_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <button onClick={deleteEvent} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Assignments */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm text-[var(--muted-foreground)] uppercase tracking-wide">Equipe</h3>
        {event.assignments.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Nenhum membro atribuído.</p>
        ) : (
          <div className="card space-y-0 divide-y divide-[var(--border)] p-0">
            {event.assignments
              .sort((a, b) => a.role.localeCompare(b.role))
              .map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[var(--muted-foreground)]">{roleLabels[assignment.role] || assignment.role}</span>
                  <span className="text-sm font-medium">{assignment.member?.name || '-'}</span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Songs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[var(--muted-foreground)] uppercase tracking-wide">Louvores</h3>
          <button
            onClick={() => setShowSongForm(true)}
            className="flex items-center gap-1.5 text-sm bg-white text-black font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <Plus className="w-3.5 h-3.5" />
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{song.order_num}. {song.title}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)] mt-1">
                        {song.version && <span className="bg-[var(--accent)] px-2 py-0.5 rounded">{song.version}</span>}
                        {song.minister && <span>Ministro: {song.minister}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {song.youtube_url && (
                        <a
                          href={song.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-red-500/10 rounded-lg hover:bg-red-500/20"
                          title="YouTube"
                        >
                          <Play className="w-4 h-4 text-red-400" />
                        </a>
                      )}
                      {song.spotify_url && (
                        <a
                          href={song.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-green-500/10 rounded-lg hover:bg-green-500/20"
                          title="Spotify"
                        >
                          <Music2 className="w-4 h-4 text-green-400" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteSong(song.id)}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-red-400 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
    spotify_url: '',
    order_num: nextOrder,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('songs').insert({
      event_id: eventId,
      order_num: form.order_num,
      title: form.title,
      version: form.version || null,
      minister: form.minister || null,
      youtube_url: form.youtube_url || null,
      spotify_url: form.spotify_url || null,
    })
    setLoading(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[var(--card)] w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto border border-[var(--border)] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <h3 className="font-bold text-lg">Adicionar Louvor</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--accent)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Ordem</label>
              <input
                type="number"
                value={form.order_num}
                onChange={(e) => setForm({ ...form, order_num: parseInt(e.target.value) })}
                min={1}
                required
              />
            </div>
            <div className="col-span-3">
              <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Título do louvor</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nome do louvor"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Versão / Artista</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="Ex: Hillsong, Bethel..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Ministro</label>
              <input
                type="text"
                value={form.minister}
                onChange={(e) => setForm({ ...form, minister: e.target.value })}
                placeholder="Quem vai ministrar"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Link YouTube</label>
            <input
              type="url"
              value={form.youtube_url}
              onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Link Spotify</label>
            <input
              type="url"
              value={form.spotify_url}
              onChange={(e) => setForm({ ...form, spotify_url: e.target.value })}
              placeholder="https://open.spotify.com/track/..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center text-sm hover:bg-gray-100"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Louvor'}
          </button>
        </form>
      </div>
    </div>
  )
}
