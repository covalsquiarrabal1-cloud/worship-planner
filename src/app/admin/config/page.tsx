'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, LogOut, Tag, CalendarOff, Guitar, Users, Edit2, ImagePlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ConfigPage() {
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setLoading(false)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <h2 className="text-xl font-bold">Configurações</h2>

      {/* ========== FUNÇÕES ========== */}
      <section className="space-y-4">
        <Link
          href="/admin/funcoes"
          className="card flex items-center justify-between hover:border-[#58a6ff] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-[#58a6ff]" />
            <div>
              <p className="text-sm font-medium">Funções (Cargos)</p>
              <p className="text-xs text-[var(--muted-foreground)]">Pastor, Ministro, Membro...</p>
            </div>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">→</span>
        </Link>
      </section>

      {/* ========== PERMISSÕES ESCALAS GERAIS ========== */}
      <SchedulePermissions />

      {/* ========== FOTOS / PERSONALIZAÇÃO ========== */}
      <PhotoSettings />

      {/* ========== LÍDERES DOS MINISTÉRIOS ========== */}
      <section className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-base">
          <Users className="w-5 h-5" />
          Líderes dos Ministérios
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Defina quem lidera cada ministério. O líder terá acesso ao painel de gestão.
        </p>
        <MinistryLeadersEditor />
      </section>

      {/* ========== VERSÍCULO ========== */}
      <section className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-base">
          📖 Versículo do Dia
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Aparece na tela inicial dos membros e líderes.
        </p>
        <VerseEditor />
      </section>

      {/* ========== LOGOUT ========== */}
      <section>
        <button onClick={handleLogout} className="card flex items-center gap-4 w-full text-red-400 hover:border-red-500/30 transition-colors">
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm">Sair</span>
        </button>
      </section>
    </div>
  )
}

function MinistryLeadersEditor() {
  const [ministries, setMinistries] = useState<{ id: string; name: string; slug: string; leader_name: string | null; leader_email: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/ministries')
      .then(r => r.json())
      .then(data => {
        setMinistries(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function startEdit(ministry: { id: string; leader_name: string | null; leader_email: string | null }) {
    setEditing(ministry.id)
    setEditName(ministry.leader_name || '')
    setEditEmail(ministry.leader_email || '')
  }

  async function saveLeader(ministryId: string) {
    setSaving(true)
    const res = await fetch('/api/ministries/update-leader', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ministryId, leaderName: editName, leaderEmail: editEmail }),
    })
    if (res.ok) {
      setMinistries(prev => prev.map(m => m.id === ministryId ? { ...m, leader_name: editName, leader_email: editEmail } : m))
      setEditing(null)
    } else {
      const data = await res.json()
      alert('Erro: ' + (data.error || 'Erro'))
    }
    setSaving(false)
  }

  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />

  return (
    <div className="space-y-3">
      {ministries.map(m => (
        <div key={m.id} className="card">
          {editing === m.id ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">{m.name}</p>
              <input
                placeholder="Nome do líder"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
              />
              <input
                placeholder="E-mail do líder (para vincular acesso)"
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveLeader(m.id)}
                  disabled={saving}
                  className="flex-1 bg-[#58a6ff] text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar'}
                </button>
                <button onClick={() => setEditing(null)} className="px-4 py-2 text-[#8b949e] text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{m.name}</p>
                {m.leader_name ? (
                  <>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">👑 {m.leader_name}</p>
                    {m.leader_email && <p className="text-xs text-[#58a6ff] mt-0.5">{m.leader_email}</p>}
                  </>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Sem líder definido</p>
                )}
              </div>
              <button
                onClick={() => startEdit(m)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--border)] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                Editar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function VerseEditor() {
  const [text, setText] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/app-settings?key=verse_text').then(r => r.json()),
      fetch('/api/app-settings?key=verse_reference').then(r => r.json()),
    ]).then(([textData, refData]) => {
      setText(textData.value || '')
      setReference(refData.value || '')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    await Promise.all([
      fetch('/api/app-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'verse_text', value: text }),
      }),
      fetch('/api/app-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'verse_reference', value: reference }),
      }),
    ])
    setSaving(false)
    alert('Versículo salvo!')
  }

  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />

  return (
    <div className="card space-y-3">
      <div>
        <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Texto do versículo</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Seja forte e corajoso! Não se apavore nem desanime..."
          rows={3}
          className="w-full resize-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-[var(--muted-foreground)] block mb-2">Referência</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Josué 1:9"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="bg-white text-black font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Versículo'}
      </button>
    </div>
  )
}

function PrivacyToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/app-settings?key=hide_other_members')
      .then(r => r.json())
      .then(data => {
        setEnabled(data.value === 'true')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function toggle() {
    const newValue = !enabled
    setSaving(true)
    setEnabled(newValue)
    await fetch('/api/app-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'hide_other_members', value: String(newValue) }),
    })
    setSaving(false)
  }

  if (loading) return <Loader2 className="w-5 h-5 animate-spin" />

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${enabled ? 'bg-[#58a6ff]' : 'bg-[#30363d]'}`}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function SchedulePermissions() {
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([])
  const [allowedRoles, setAllowedRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [rolesRes, settingsRes] = await Promise.all([
      fetch('/api/person-roles'),
      fetch('/api/app-settings?key=roles_can_view_all_schedules'),
    ])

    if (rolesRes.ok) setRoles(await rolesRes.json())
    if (settingsRes.ok) {
      const data = await settingsRes.json()
      if (data.value && Array.isArray(data.value)) {
        setAllowedRoles(data.value)
      }
    }
    setLoading(false)
  }

  async function toggleRole(roleName: string) {
    const newRoles = allowedRoles.includes(roleName)
      ? allowedRoles.filter(r => r !== roleName)
      : [...allowedRoles, roleName]
    setAllowedRoles(newRoles)

    setSaving(true)
    await fetch('/api/app-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'roles_can_view_all_schedules', value: newRoles }),
    })
    setSaving(false)
  }

  if (loading) return <div className="py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2 text-base">
          <Users className="w-5 h-5" />
          Acesso às Escalas Gerais
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Defina quais funções podem visualizar as escalas de todos os ministérios.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {roles.map(role => (
          <button
            key={role.id}
            onClick={() => toggleRole(role.name)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
              allowedRoles.includes(role.name)
                ? 'bg-green-500/15 text-green-400 border-green-500/40'
                : 'bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--muted-foreground)]'
            }`}
          >
            {allowedRoles.includes(role.name) ? '✓ ' : ''}{role.name}
          </button>
        ))}
      </div>
      {saving && <p className="text-[10px] text-[var(--muted-foreground)]">Salvando...</p>}
    </section>
  )
}

function PhotoSettings() {
  const [escalasImage, setEscalasImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadImages()
  }, [])

  async function loadImages() {
    const res = await fetch('/api/app-settings?key=escalas_gerais_bg')
    if (res.ok) {
      const data = await res.json()
      if (data.value) setEscalasImage(data.value)
    }
    setLoading(false)
  }

  async function handleUpload(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Compress/resize image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = async () => {
      // Max width for header: 1200px, for escalas: 800px
      const maxWidth = key === 'header_image' ? 1200 : 800
      const scale = Math.min(1, maxWidth / img.width)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)

      setSaving(key)
      await fetch('/api/app-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: dataUrl }),
      })

      setEscalasImage(dataUrl)
      setSaving(null)
    }

    img.src = URL.createObjectURL(file)
  }

  async function removeImage(key: string) {
    setSaving(key)
    await fetch('/api/app-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: null }),
    })
    if (key === 'escalas_gerais_bg') setEscalasImage(null)
    setSaving(null)
  }

  if (loading) return <div className="py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2 text-base">
          <ImagePlus className="w-5 h-5" />
          Personalização Visual
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Defina imagens de fundo e header do app.</p>
      </div>

      {/* Escalas Gerais background */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Fundo - Escalas Gerais</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">Aparece atrás do grid de ministérios.</p>
          </div>
          {escalasImage && (
            <button onClick={() => removeImage('escalas_gerais_bg')} className="text-xs text-red-400 hover:text-red-300">
              Remover
            </button>
          )}
        </div>
        {escalasImage ? (
          <div className="relative rounded-xl overflow-hidden h-24">
            <img src={escalasImage} alt="Escalas BG" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 py-6 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[#58a6ff] transition-colors">
            <ImagePlus className="w-5 h-5 text-[var(--muted-foreground)]" />
            <span className="text-sm text-[var(--muted-foreground)]">Selecionar imagem</span>
            <input type="file" accept="image/*" onChange={(e) => handleUpload('escalas_gerais_bg', e)} className="hidden" />
          </label>
        )}
        {saving === 'escalas_gerais_bg' && <p className="text-[10px] text-[var(--muted-foreground)]">Salvando...</p>}
      </div>
    </section>
  )
}
