'use client'

import { useState, useEffect } from 'react'
import { Loader2, Tag, Users, Settings } from 'lucide-react'
import { getMinistryIcon3D } from '@/lib/ministry-icons'

interface PersonRole {
  id: string
  name: string
}

export default function ConfigStaffPage() {
  const [roles, setRoles] = useState<PersonRole[]>([])
  const [ministries, setMinistries] = useState<{ id: string; name: string; slug: string; leader_name: string | null }[]>([])
  const [allowedRoles, setAllowedRoles] = useState<string[]>([])
  const [verse, setVerse] = useState({ text: '', reference: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [rolesRes, ministriesRes, settingsRes, verseTextRes, verseRefRes] = await Promise.all([
      fetch('/api/person-roles'),
      fetch('/api/ministries'),
      fetch('/api/app-settings?key=roles_can_view_all_schedules'),
      fetch('/api/app-settings?key=verse_text'),
      fetch('/api/app-settings?key=verse_reference'),
    ])

    if (rolesRes.ok) setRoles(await rolesRes.json())
    if (ministriesRes.ok) {
      const data = await ministriesRes.json()
      setMinistries(Array.isArray(data) ? data : [])
    }
    if (settingsRes.ok) {
      const data = await settingsRes.json()
      if (data.value && Array.isArray(data.value)) setAllowedRoles(data.value)
    }
    if (verseTextRes.ok) {
      const data = await verseTextRes.json()
      setVerse(prev => ({ ...prev, text: data.value || '' }))
    }
    if (verseRefRes.ok) {
      const data = await verseRefRes.json()
      setVerse(prev => ({ ...prev, reference: data.value || '' }))
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">Configurações</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Visualização das configurações do app (somente leitura)</p>
      </div>

      {/* Badge read-only */}
      <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Modo visualização — entre em contato com o admin para alterações
      </div>

      {/* Funções */}
      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-base">
          <Tag className="w-5 h-5 text-[#58a6ff]" />
          Funções (Cargos)
        </h3>
        <div className="flex flex-wrap gap-2">
          {roles.map(role => (
            <span key={role.id} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]">
              {role.name}
            </span>
          ))}
        </div>
      </section>

      {/* Permissões Escalas Gerais */}
      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-base">
          <Users className="w-5 h-5" />
          Acesso às Escalas Gerais
        </h3>
        <p className="text-xs text-[var(--muted-foreground)]">Funções com permissão para visualizar todas as escalas:</p>
        <div className="flex flex-wrap gap-2">
          {allowedRoles.map(role => (
            <span key={role} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/40">
              ✓ {role}
            </span>
          ))}
          {allowedRoles.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)] italic">Nenhuma função configurada</p>
          )}
        </div>
      </section>

      {/* Líderes dos Ministérios */}
      <section className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-base">
          <Users className="w-5 h-5" />
          Líderes dos Ministérios
        </h3>
        <div className="space-y-2">
          {ministries.map(m => (
            <div key={m.id} className="card flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1c2128] border border-[#30363d] flex items-center justify-center shrink-0">
                <img src={getMinistryIcon3D(m.slug)} alt={m.name} className="w-6 h-6 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{m.name}</p>
                {m.leader_name ? (
                  <p className="text-xs text-[var(--muted-foreground)]">👑 {m.leader_name}</p>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)] italic">Sem líder definido</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Versículo */}
      {verse.text && (
        <section className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2 text-base">
            📖 Versículo do Dia
          </h3>
          <div className="card">
            <p className="text-sm italic text-[var(--foreground)]">&ldquo;{verse.text}&rdquo;</p>
            {verse.reference && (
              <p className="text-xs text-[#58a6ff] mt-2 font-medium">— {verse.reference}</p>
            )}
          </div>
        </section>
      )}

      <div className="h-24" />
    </div>
  )
}
