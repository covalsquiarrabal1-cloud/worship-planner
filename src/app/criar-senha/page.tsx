'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react'

export default function CriarSenhaPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      // Update password via Supabase client (user is already authenticated)
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      })

      if (updateError) {
        setError('Erro ao criar senha: ' + updateError.message)
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError('Erro: ' + (err?.message || 'desconhecido'))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#58a6ff]/10 mb-6">
            <Lock className="w-8 h-8 text-[#58a6ff]" />
          </div>
          <h1 className="text-2xl font-bold">Crie sua Senha</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-3">
            É seu primeiro acesso! Crie uma senha pessoal para suas próximas entradas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nova senha (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            placeholder="Confirme a senha"
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
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Criar Senha'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
