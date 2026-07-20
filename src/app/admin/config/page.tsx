'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Loader2, X, LogOut, Tag, CalendarOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ScaleType {
  id: string
  name: string
  type: 'normal' | 'strong_brothers' | 'empoderadas'
}

export default function ConfigPage() {
  const [scaleTypes, setScaleTypes] = useState<ScaleType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<ScaleType['type']>('normal')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadScaleTypes()
  }, [])

  async function loadScaleTypes() {
    const { data } = await supabase.from('scale_types').select('*').order('name')
    setScaleTypes(data || [])
    setLoading(false)
  }

  async function addScaleType(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await supabase.from('scale_types').insert({ name: newName.trim(), type: newType })
    setNewName('')
    setNewType('normal')
    setShowForm(false)
    loadScaleTypes()
  }

  async function deleteScaleType(id: string) {
    if (!confirm('Excluir este tipo de escala?')) return
    await supabase.from('scale_types').delete().eq('id', id)
    loadScaleTypes()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const typeLabels = {
    normal: 'Normal (1H + 2M)',
    strong_brothers: 'Strong Brothers (3H)',
    empoderadas: 'Empoderadas (3M)',
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Configurações</h2>

      {/* Scale Types */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Tipos de Escala
          </h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 bg-white text-black font-semibold px-3 py-1.5 rounded-lg text-sm"
          >
            <Plus className="w-3 h-3" />
            Novo
          </button>
        </div>

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : (
          <div className="space-y-2">
            {scaleTypes.map((st) => (
              <div key={st.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{st.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{typeLabels[st.type]}</p>
                </div>
                <button
                  onClick={() => deleteScaleType(st.id)}
                  className="p-2 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bloqueios Link */}
      <section>
        <Link
          href="/admin/membros/bloqueios"
          className="card flex items-center gap-3 w-full"
        >
          <CalendarOff className="w-5 h-5 text-red-400" />
          <div>
            <p className="font-medium">Bloqueios Específicos</p>
            <p className="text-xs text-[var(--muted-foreground)]">Bloquear membros em datas específicas</p>
          </div>
        </Link>
      </section>

      {/* Logout */}
      <section>
        <button
          onClick={handleLogout}
          className="card flex items-center gap-3 w-full text-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </section>

      {/* Add Scale Type Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[var(--card)] w-full max-w-md rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold">Novo Tipo de Escala</h3>
              <button onClick={() => setShowForm(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={addScaleType} className="p-4 space-y-4">
              <div>
                <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Nome</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: ALIVE, CELEBRAÇÃO..."
                  required
                />
              </div>
              <div>
                <label className="text-sm text-[var(--muted-foreground)] mb-1 block">Regra de Composição</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ScaleType['type'])}
                >
                  <option value="normal">Normal (1 homem + 2 mulheres)</option>
                  <option value="strong_brothers">Strong Brothers (3 homens)</option>
                  <option value="empoderadas">Empoderadas (3 mulheres)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-white text-black font-semibold py-3 rounded-xl"
              >
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
