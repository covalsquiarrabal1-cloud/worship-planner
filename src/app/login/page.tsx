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
  const [step, setStep] = useState<'email' | 'password' | 'create-password'>('email')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const supabase = createClient()
  const router = useRouter()

  // Step 1: Check email
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/login/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro')
        setLoading(false)
        return
      }

      if (data.hasPassword) {
        setStep('password')
      } else {
        // First access - auto login with internal and go to create password
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        if (sessionError) {
          setError('Erro ao iniciar sessão.')
          setLoading(false)
          return
        }
        setStep('create-password')
      }
      setLoading(false)
    } catch {
      setError('Falha na conexão.')
      setLoading(false)
    }
  }

  // Step 2: Login with password
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

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Senha incorreta.')
        setLoading(false)
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) {
        setError('Erro ao iniciar sessão.')
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Falha na conexão.')
      setLoading(false)
    }
  }

  // Step 3: Create password
  const handleCreatePassword = async (e: React.FormEvent) => {
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

    router.push('/')
    router.refresh()
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
          <p className="text-[var(--muted-foreground)] text-sm mt-3">
            {step === 'email' && 'Digite seu e-mail para entrar'}
            {step === 'password' && 'Digite sua senha'}
            {step === 'create-password' && 'Crie sua senha para os próximos acessos'}
          </p>
        </div>

        {/* Step: Email */}
        {step === 'email' && (
          <form onSubmit={handleCheckEmail} className="space-y-4">
            <input
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full text-center"
              autoFocus
            />

            {error && (
              <p className="text-[var(--destructive)] text-sm text-center bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold py-5 rounded-2xl hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-2 text-lg transition-all shadow-[0_4px_0_0_#888] hover:shadow-[0_2px_0_0_#888] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuar'}
            </button>
          </form>
        )}

        {/* Step: Password */}
        {step === 'password' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="card text-center text-sm">
              <span className="text-[var(--muted-foreground)]">{email}</span>
              <button type="button" onClick={() => { setStep('email'); setError('') }} className="text-[#58a6ff] ml-2 text-xs">trocar</button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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

            {error && (
              <p className="text-[var(--destructive)] text-sm text-center bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold py-5 rounded-2xl hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-2 text-lg transition-all shadow-[0_4px_0_0_#888] hover:shadow-[0_2px_0_0_#888] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
            </button>
          </form>
        )}

        {/* Step: Create Password */}
        {step === 'create-password' && (
          <form onSubmit={handleCreatePassword} className="space-y-4">
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Senha e Entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
