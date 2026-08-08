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
  const [checking, setChecking] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Supabase automatically handles the token from the URL hash
    // We just need to check if we have a valid session
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Try to get session from URL (Supabase handles this automatically)
        const { data, error } = await supabase.auth.getSession()
        if (!data.session) {
          setError('Link inválido ou expirado. Solicite um novo link de redefinição.')
        }
      }
      setChecking(false)
    }
    
    // Small delay to let Supabase process the URL hash
    setTimeout(checkSession, 1000)
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

    // Redirect to home after 2 seconds
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 2000)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
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
          <div className="space-y-4">
            <div className="card text-center space-y-3">
              <span className="text-3xl">✅</span>
              <p className="text-sm font-medium">Senha redefinida!</p>
              <p className="text-xs text-[var(--muted-foreground)]">Redirecionando...</p>
            </div>
          </div>
        ) : error && !newPassword ? (
          <div className="space-y-4">
            <div className="card text-center space-y-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-sm text-red-400">{error}</p>
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
