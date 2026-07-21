'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Music, Mail, Loader2, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError('Erro ao enviar o link. Verifique o e-mail.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/20 mb-5">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Link enviado!</h1>
          <p className="text-[var(--muted-foreground)] text-sm mb-6">
            Verifique sua caixa de entrada em <strong className="text-white">{email}</strong> e clique no link para entrar.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
          >
            Usar outro e-mail
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-5">
            <Music className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-bold">Worship Planner</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-2">Digite seu e-mail para receber o link de acesso</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--muted-foreground)]" />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-with-icon"
              required
              autoComplete="email"
            />
          </div>

          {error && (
            <p className="text-[var(--destructive)] text-sm text-center bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Enviar link de acesso'
            )}
          </button>
        </form>

        <p className="text-xs text-center text-[var(--muted-foreground)] mt-6">
          Sem senha necessária. Você receberá um link no e-mail.
        </p>
      </div>
    </div>
  )
}
