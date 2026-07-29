'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      let data: any = null
      try {
        data = await res.json()
      } catch {
        setError(`Erro no servidor (${res.status}). Tente novamente.`)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(data?.error || `Erro ${res.status}. Tente novamente.`)
        setLoading(false)
        return
      }

      if (!data?.session?.access_token) {
        setError('Resposta inválida do servidor.')
        setLoading(false)
        return
      }

      // Set the session on the client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) {
        setError('Erro ao iniciar sessão: ' + sessionError.message)
        setLoading(false)
        return
      }

      // Check if user needs to set password
      if (data.mustSetPassword) {
        router.push('/criar-senha')
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (err: any) {
      setError('Falha na conexão: ' + (err?.message || 'verifique sua internet'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 overflow-hidden">
            <img src="/icon-512.png" alt="Worship Planner" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold mt-2">Worship Planner</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-3">Entre com seu e-mail e senha</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <p className="text-[var(--destructive)] text-sm text-center bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-5 rounded-2xl hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-2 text-lg transition-all shadow-[0_4px_0_0_#888] hover:shadow-[0_2px_0_0_#888] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="text-xs text-[var(--muted-foreground)] text-center mt-6">
          Primeiro acesso? Use a senha temporária enviada pelo líder.
        </p>
      </div>
    </div>
  )
}
