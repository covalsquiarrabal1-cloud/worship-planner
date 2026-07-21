'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Music, ExternalLink, Loader2, Plus, Trash2, X, MessageSquare, Link2 } from 'lucide-react'

interface SongEvent {
  id: string
  event_date: string
  day_of_week: string
  scale_type: { name: string } | null
  songs: {
    id: string
    order_num: number
    title: string
    version: string | null
    minister: string | null
    youtube_url: string | null
  }[]
}

interface Suggestion {
  id: string
  member_name: string
  member_email: string | null
  link: string | null
  message: string | null
  is_read: boolean
  created_at: string
}

export default function AdminMusicasPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<SongEvent[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState<string | null>(null) // event_id
  const [editingLink, setEditingLink] = useState<string | null>(null) // song_id
  const [linkValue, setLinkValue] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'musicas' | 'sugestoes'>('musicas')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadData()
  }, [currentDate])

  async function loadData() {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const [songsRes, suggestionsRes] = await Promise.all([
      fetch(`/api/songs?start=${start}&end=${end}`),
      fetch('/api/suggestions'),
    ])

    if (songsRes.ok) {
      const data = await songsRes.json()
      setEvents(Array.isArray(data) ? data : [])
    }
    if (suggestionsRes.ok) {
      const data = await suggestionsRes.json()
      setSuggestions(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  async function generateSongs() {
    if (!confirm('Gerar louvores automaticamente para todos os dias do mês? Isso substituirá os louvores existentes.')) return
    setGenerating(true)
    const month = currentDate.getMonth() + 1
    const year = currentDate.getFullYear()
    const res = await fetch('/api/gerar-louvores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert('Erro: ' + (data.error || 'Erro desconhecido'))
    } else {
      alert(`${data.songsCreated} louvores gerados com sucesso!`)
      loadData()
    }
    setGenerating(false)
  }

  async function addSong(eventId: string) {
    if (!newTitle.trim()) return
    setSaving(true)

    const existingSongs = events.find(e => e.id === eventId)?.songs || []
    const nextOrder = existingSongs.length + 1

    await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        title: newTitle.trim(),
        youtube_url: newUrl.trim() || null,
        order_num: nextOrder,
      }),
    })

    setNewTitle('')
    setNewUrl('')
    setShowAddForm(null)
    setSaving(false)
    loadData()
  }

  async function deleteSong(id: string) {
    if (!confirm('Remover este louvor?')) return
    await fetch(`/api/songs?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  async function deleteSuggestion(id: string) {
    await fetch(`/api/suggestions?id=${id}`, { method: 'DELETE' })
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  async function saveLink(songId: string) {
    await fetch('/api/songs/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: songId, youtube_url: linkValue.trim() || null }),
    })
    setEditingLink(null)
    setLinkValue('')
    loadData()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('musicas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'musicas' ? 'bg-white text-black' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}
        >
          <Music className="w-4 h-4 inline mr-1.5" />
          Músicas
        </button>
        <button
          onClick={() => setTab('sugestoes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${tab === 'sugestoes' ? 'bg-white text-black' : 'bg-[var(--accent)] text-[var(--muted-foreground)]'}`}
        >
          <MessageSquare className="w-4 h-4 inline mr-1.5" />
          Sugestões
          {suggestions.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'sugestoes' ? (
        /* === SUGESTÕES === */
        <div className="space-y-3">
          <h3 className="font-semibold">Sugestões dos Membros</h3>
          {suggestions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Nenhuma sugestão recebida.</p>
          ) : (
            suggestions.map((s) => (
              <div key={s.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{s.member_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {format(new Date(s.created_at), "dd/MM 'às' HH:mm")}
                    </p>
                  </div>
                  <button onClick={() => deleteSuggestion(s.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {s.message && <p className="text-sm">{s.message}</p>}
                {s.link && (
                  <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                    {s.link.length > 50 ? s.link.slice(0, 50) + '...' : s.link}
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* === MÚSICAS === */
        <>
          {/* Month Navigation + Generate button */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-lg bg-[var(--accent)]">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={generateSongs}
            disabled={generating}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : '🎵 Gerar Louvores Automaticamente'}
          </button>

          {events.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <p>Nenhum evento neste mês. Gere a escala primeiro.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[var(--muted-foreground)] capitalize">
                        {event.day_of_week}, {format(new Date(event.event_date + 'T12:00:00'), 'dd/MM')}
                      </span>
                      <h4 className="font-semibold text-green-400">{event.scale_type?.name || '-'}</h4>
                    </div>
                    <button
                      onClick={() => setShowAddForm(showAddForm === event.id ? null : event.id)}
                      className="p-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--border)]"
                      title="Adicionar louvor"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Songs list */}
                  {event.songs.length > 0 && (
                    <div className="space-y-1">
                      {event.songs.sort((a, b) => a.order_num - b.order_num).map((song) => (
                        <div key={song.id} className="flex items-center gap-2 bg-[var(--accent)] rounded-lg px-3 py-2">
                          <span className="text-xs text-[var(--muted-foreground)] w-5">{song.order_num}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{song.title}</p>
                          </div>
                          {song.youtube_url && (
                            <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" className="p-1 text-red-400 shrink-0">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button onClick={() => deleteSong(song.id)} className="p-1 text-red-400 hover:bg-red-500/10 rounded shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add form */}
                  {showAddForm === event.id && (
                    <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                      <input
                        type="text"
                        placeholder="Nome do louvor"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        autoFocus
                      />
                      <input
                        type="url"
                        placeholder="Link (YouTube, Spotify, etc.)"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => addSong(event.id)}
                          disabled={saving || !newTitle.trim()}
                          className="flex-1 bg-white text-black font-medium py-2 rounded-lg text-sm disabled:opacity-40"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Adicionar'}
                        </button>
                        <button
                          onClick={() => { setShowAddForm(null); setNewTitle(''); setNewUrl('') }}
                          className="p-2 text-[var(--muted-foreground)]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
