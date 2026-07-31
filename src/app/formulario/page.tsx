'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface Ministry {
  id: string
  name: string
  slug: string
}

interface SelectedMinistry {
  ministry_id: string
  role: 'membro' | 'lider' | 'ambos'
}

export default function FormularioPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [selections, setSelections] = useState<SelectedMinistry[]>([])
  const [otherMinistry, setOtherMinistry] = useState('')
  const [otherRole, setOtherRole] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadMinistries()
  }, [])

  async function loadMinistries() {
    try {
      const res = await fetch('/api/signup/ministries')
      if (res.ok) {
        const data = await res.json()
        setMinistries(Array.isArray(data) ? data : [])
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }

  function toggleMinistry(ministryId: string) {
    setSelections(prev => {
      const exists = prev.find(s => s.ministry_id === ministryId)
      if (exists) {
        return prev.filter(s => s.ministry_id !== ministryId)
      }
      return [...prev, { ministry_id: ministryId, role: 'membro' }]
    })
  }

  function setMinistryRole(ministryId: string, role: 'membro' | 'lider') {
    setSelections(prev =>
      prev.map(s => {
        if (s.ministry_id !== ministryId) return s
        // Toggle: se já está selecionado, deseleciona. Se o outro já está, vira "ambos"
        if (role === 'membro') {
          if (s.role === 'membro') return { ...s, role: 'lider' }
          if (s.role === 'lider') return { ...s, role: 'ambos' }
          if (s.role === 'ambos') return { ...s, role: 'lider' }
        }
        if (role === 'lider') {
          if (s.role === 'lider') return { ...s, role: 'membro' }
          if (s.role === 'membro') return { ...s, role: 'ambos' }
          if (s.role === 'ambos') return { ...s, role: 'membro' }
        }
        return s
      })
    )
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !phone.trim() || !birthDate) {
      setError('Preencha todos os campos.')
      return
    }

    if (selections.length === 0 && !otherMinistry.trim()) {
      setError('Selecione pelo menos um ministério ou descreva no campo abaixo.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          birth_date: birthDate,
          ministries: selections,
          other_ministry: otherMinistry.trim() || null,
          other_role: otherRole.trim() || null,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao enviar formulário.')
      }
    } catch {
      setError('Falha na conexão. Tente novamente.')
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Inscrição Enviada!</h1>
        <p className="text-[var(--muted-foreground)]">
          Obrigado por preencher o formulário. Sua inscrição será processada em breve.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden">
            <img src="/icon-512.png" alt="Logo" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold">Cadastro de Ministérios</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">
            Preencha seus dados e selecione os ministérios que você participa.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dados pessoais */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nome completo"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full"
            />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full"
            />
            <input
              type="tel"
              placeholder="Telefone (DDD + número)"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              required
              className="w-full"
            />
            <div>
              <label className="text-sm text-[var(--muted-foreground)] block mb-1">Data de nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Ministérios */}
          <div>
            <h2 className="font-semibold text-sm mb-3">Selecione os ministérios que você participa:</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {ministries.map(ministry => {
                const selected = selections.find(s => s.ministry_id === ministry.id)
                return (
                  <div key={ministry.id} className="card p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleMinistry(ministry.id)}
                        className="w-5 h-5 rounded accent-[#58a6ff]"
                      />
                      <span className="font-medium text-sm flex-1">{ministry.name}</span>
                      {selected && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setMinistryRole(ministry.id, 'membro') }}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                              selected.role === 'membro' || selected.role === 'ambos'
                                ? 'bg-[#58a6ff] text-white'
                                : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'
                            }`}
                          >
                            Membro
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setMinistryRole(ministry.id, 'lider') }}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                              selected.role === 'lider' || selected.role === 'ambos'
                                ? 'bg-amber-500 text-white'
                                : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'
                            }`}
                          >
                            Líder
                          </button>
                        </div>
                      )}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Não encontrou seu ministério */}
          <div className="card p-4 space-y-3">
            <p className="text-sm font-semibold">Não encontrou seu ministério?</p>
            <p className="text-xs text-[var(--muted-foreground)]">Descreva qual ministério e sua função.</p>
            <input
              type="text"
              placeholder="Nome do ministério"
              value={otherMinistry}
              onChange={e => setOtherMinistry(e.target.value)}
              className="w-full"
            />
            <input
              type="text"
              placeholder="Sua função (ex: membro, líder, auxiliar...)"
              value={otherRole}
              onChange={e => setOtherRole(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-center bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg text-red-400">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-2 text-lg transition-all shadow-[0_4px_0_0_#888] hover:shadow-[0_2px_0_0_#888] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Inscrição'}
          </button>
        </form>
      </div>
    </div>
  )
}
