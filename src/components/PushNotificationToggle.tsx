'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

export default function PushNotificationToggle() {
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission as any)
    }
    checkSubscription()
  }, [])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator)) return
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    setSubscribed(!!sub)
  }

  async function subscribe() {
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm as any)
      if (perm !== 'granted') { setLoading(false); return }

      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      if (res.ok) setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe error:', err)
    }
    setLoading(false)
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()

      await fetch('/api/push/subscribe', { method: 'DELETE' })
      setSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe error:', err)
    }
    setLoading(false)
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null // Push not supported
  }

  if (permission === 'denied') {
    return (
      <div className="card flex items-center gap-3 opacity-50">
        <BellOff className="w-5 h-5 text-red-400 shrink-0" />
        <div>
          <p className="text-sm font-medium">Notificações bloqueadas</p>
          <p className="text-xs text-[var(--muted-foreground)]">Ative nas configurações do navegador</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Bell className={`w-5 h-5 shrink-0 ${subscribed ? 'text-green-400' : 'text-[var(--muted-foreground)]'}`} />
        <div>
          <p className="text-sm font-medium">Notificações Push</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {subscribed ? 'Você receberá avisos da escala' : 'Receba avisos quando for escalado'}
          </p>
        </div>
      </div>
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
          subscribed
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-[#58a6ff] text-white'
        }`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : subscribed ? 'Ativado ✓' : 'Ativar'}
      </button>
    </div>
  )
}
