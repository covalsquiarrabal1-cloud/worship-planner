'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function CriarSenhaPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    // Listen for auth state changes - handles both hash tokens and existing sessions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
        setChecking(false)
      }
    })

    // Check for existing session (set by /auth/callback PKCE flow)
    async function checkSession() {
      // Small delay to let onAuthStateChange fire first if there's a hash
      await new Promise(resolve => setTimeout(resolve, 500))
      if (cancelled) return

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
        setChecking(false)
        return
      }

      // Check URL hash (legacy implicit flow fallback)
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        // Give Supabase time to process the hash
        await new Promise(resolve => setTimeout(resolve, 2000))
        if (cancelled) return
        const { data: { session: s2 } } = await supabase.auth.getSession()
        if (s2) {
          setReady(true)
          setChecking(false)
          return
        }
      }

      // No session found after all checks
      if (!cancelled) {
        setError('Link inválido ou expirado. Solicite um novo link de redefinição.')
        setChecking(false)
      }
    }

    checkSession()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      data: { password_set: true },
    })

    if (updateError) {
      setError('Erro: ' + updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 2000)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin mb-4" />
        <p className="text-sm text-[var(--muted-foreground)]">Verificando link...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 overflow-hidden">
            <img src="/icon-512.png" alt="Worship Planner" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold mt-2">Redefinir Senha</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-3">
            {success ? 'Senha atualizada com sucesso!' : 'Crie sua nova senha'}
          </p>
        </div>

        {success ? (
          <div className="card text-center space-y-3">
            <span className="text-3xl">✅</span>
            <p className="text-sm font-medium">Senha redefinida!</p>
            <p className="text-xs text-[var(--muted-foreground)]">Redirecionando...</p>
          </div>
        ) : !ready ? (
          <div className="space-y-4">
            <div className="card text-center space-y-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm text-red-400">{error || 'Link inválido ou expirado.'}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Volte ao login e solicite um novo link.</p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-4 rounded-2xl border border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:text-white transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nova senha (mínimo 6 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full pr-12"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirme a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full"
            />

            {error && (
              <p className="text-[var(--destructive)] text-sm text-center bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#58a6ff] text-white font-bold py-5 rounded-2xl hover:bg-[#4c94e0] disabled:opacity-50 flex items-center justify-center gap-2 text-lg transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
