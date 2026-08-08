'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, Download } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [firstAccess, setFirstAccess] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [bgImage, setBgImage] = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Load background image
    fetch('/api/app-settings?key=escalas_gerais_bg')
      .then(r => r.json())
      .then(d => { if (d.value) setBgImage(d.value) })
      .catch(() => {})

    // Capture install prompt
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBtn(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBtn(false)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') {
      setShowInstallBtn(false)
    }
    setInstallPrompt(null)
  }

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

      if (res.ok && data.session) {
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
        return
      }

      if (res.status === 401) {
        const checkRes = await fetch('/api/login/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        })

        const checkData = await checkRes.json()

        if (!checkRes.ok) {
          setError(checkData.error || 'E-mail não cadastrado.')
          setLoading(false)
          return
        }

        if (!checkData.hasPassword) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: checkData.session.access_token,
            refresh_token: checkData.session.refresh_token,
          })
          if (sessionError) {
            setError('Erro ao iniciar sessão.')
            setLoading(false)
            return
          }
          setFirstAccess(true)
          setLoading(false)
          return
        }

        setError('Senha incorreta.')
        setLoading(false)
        return
      }

      setError(data.error || 'Erro ao entrar.')
      setLoading(false)
    } catch {
      setError('Falha na conexão.')
      setLoading(false)
    }
  }

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Digite seu e-mail.')
      return
    }

    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/criar-senha`,
    })

    if (resetError) {
      setError('Erro: ' + resetError.message)
      setLoading(false)
      return
    }

    setResetSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      {/* Background image */}
      {bgImage && (
        <div className="fixed inset-0 z-0">
          <img src={bgImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
      )}

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 overflow-hidden">
            <img src="/icon-512.png" alt="Worship Planner" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold mt-2">Worship Planner</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-3">
            {firstAccess ? 'Crie sua senha para os próximos acessos' : resetMode ? 'Digite seu e-mail para receber o link de redefinição' : 'Entre com seu e-mail e senha'}
          </p>
        </div>

        {/* First Access - Create Password */}
        {firstAccess ? (
          <form onSubmit={handleCreatePassword} className="space-y-4">
            <div className="card text-center text-sm">
              <span className="text-[var(--muted-foreground)]">✅ {email}</span>
            </div>

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
        ) : resetMode ? (
          /* Reset Password Mode */
          resetSent ? (
            <div className="space-y-4">
              <div className="card text-center space-y-3">
                <span className="text-3xl">📧</span>
                <p className="text-sm font-medium">E-mail enviado!</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Verifique sua caixa de entrada (e spam) em <strong>{email}</strong>. Clique no link para redefinir sua senha.
                </p>
              </div>
              <button
                onClick={() => { setResetMode(false); setResetSent(false); setError('') }}
                className="w-full py-4 rounded-2xl border border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:text-white transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full"
                autoFocus
              />

              {error && (
                <p className="text-[var(--destructive)] text-sm text-center bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#58a6ff] text-white font-bold py-5 rounded-2xl hover:bg-[#4c94e0] disabled:opacity-50 flex items-center justify-center gap-2 text-lg transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar link de redefinição'}
              </button>

              <button
                type="button"
                onClick={() => { setResetMode(false); setError('') }}
                className="w-full py-3 text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
              >
                Voltar ao login
              </button>
            </form>
          )
        ) : (
          /* Normal Login */
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full"
              autoFocus
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => { setResetMode(true); setError('') }}
              className="w-full py-2 text-sm text-[#58a6ff] hover:underline transition-colors"
            >
              Esqueci minha senha
            </button>
          </form>
        )}

        {!firstAccess && !resetMode && (
          <p className="text-xs text-[var(--muted-foreground)] text-center mt-6">
            Primeiro acesso? Digite seu e-mail e qualquer senha — o sistema vai pedir para criar uma nova.
          </p>
        )}

        {/* Install App button */}
        {showInstallBtn && (
          <button
            onClick={handleInstall}
            className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm text-sm font-medium text-[var(--muted-foreground)] hover:text-[#58a6ff] hover:border-[#58a6ff]/50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Instalar App na tela inicial
          </button>
        )}

        {/* iOS install instructions */}
        {!showInstallBtn && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches && (
          <div className="mt-6 text-center py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/80">
            <p className="text-xs text-[var(--muted-foreground)]">
              Para instalar: toque em <span className="text-white font-medium">Compartilhar</span> (⬆️) e depois <span className="text-white font-medium">Adicionar à Tela Inicial</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
