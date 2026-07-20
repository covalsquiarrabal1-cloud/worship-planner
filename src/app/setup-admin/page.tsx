'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'

export default function SetupAdminPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handlePromote() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/make-admin', { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro desconhecido')
      setLoading(false)
      return
    }

    setResult(data.message)
    setLoading(false)

    // Redirect to admin after 2 seconds
    setTimeout(() => {
      router.push('/admin')
      router.refresh()
    }, 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <ShieldCheck className="w-16 h-16 mx-auto text-green-400" />
        <h1 className="text-2xl font-bold">Setup Admin</h1>
        <p className="text-[var(--muted-foreground)]">
          Clique abaixo para promover sua conta a administrador.
        </p>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {result ? (
          <div className="space-y-2">
            <p className="text-green-400 font-medium">{result}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Redirecionando para /admin...</p>
          </div>
        ) : (
          <button
            onClick={handlePromote}
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Tornar-me Admin'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
