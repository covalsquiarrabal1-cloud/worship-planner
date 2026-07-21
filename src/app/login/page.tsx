'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Music, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/login-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || `Erro ${res.status}. Tente novamente.`)
        setLoading(false)
        return
      }

      const data = await res.json()

      // Set the session on the client
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError('Erro de conexão: ' + (err?.message || 'verifique sua internet'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white mb-6">
            <Music className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-2xl font-bold mt-2">Worship Planner</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-3">Digite seu e-mail para entrar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="Digite seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full text-center"
          />

          {error && (
            <p className="text-[var(--destructive)] text-sm text-center bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-2 text-base transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
