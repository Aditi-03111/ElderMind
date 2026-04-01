import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { AppShell } from '../ui/AppShell'
import { Card } from '../ui/Card'
import { MicButton } from '../ui/MicButton'
import { PressableButton } from '../ui/Pressable'
import { ElderSticker, SparkleSticker } from '../ui/stickers'
import { listenOnce, speak, stopSpeaking } from '../lib/speech'
import { postVoice } from '../lib/api'
import { saveConversation } from '../lib/db'
import { nowMs, uid } from '../lib/ids'

export function HomePage() {
  const [speaking, setSpeaking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastUser, setLastUser] = useState<string>('')
  const [lastBot, setLastBot] = useState<string>('')
  const [error, setError] = useState<string>('')
  const stickerRef = useRef<HTMLDivElement | null>(null)

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  useLayoutEffect(() => {
    const el = stickerRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { rotate: -2, y: 6, opacity: 0 }, { rotate: 0, y: 0, opacity: 1, duration: 0.6 })
    }, el)
    return () => ctx.revert()
  }, [])

  useLayoutEffect(() => {
    const el = stickerRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      if (speaking) {
        gsap.to(el, { rotate: 2, duration: 0.4, yoyo: true, repeat: 3, ease: 'sine.inOut' })
      } else {
        gsap.to(el, { rotate: 0, duration: 0.25 })
      }
    }, el)
    return () => ctx.revert()
  }, [speaking])

  const getGeoOnce = async (): Promise<{ lat: number; lon: number } | null> => {
    if (!('geolocation' in navigator)) return null
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60_000 },
      )
    })
  }

  const runVoice = async () => {
    setError('')
    if (busy) return

    if (speaking) {
      setSpeaking(false)
      stopSpeaking()
      return
    }

    try {
      setSpeaking(true)
      const { transcript } = await listenOnce({ lang: 'en-IN', timeoutMs: 9000 })
      setLastUser(transcript)
      setSpeaking(false)

      setBusy(true)
      const geo = await getGeoOnce()
      const res = await postVoice({ user_id: 'demo', text: transcript, lat: geo?.lat, lon: geo?.lon })
      setLastBot(res.text)
      void saveConversation({
        id: uid(),
        createdAt: nowMs(),
        userText: transcript,
        botText: res.text,
        mood: res.mood,
      })
      speak(res.text, { lang: 'en-IN', rate: 0.92, pitch: 1.02 })
    } catch (e: unknown) {
      setSpeaking(false)
      setError((e as { message?: string } | undefined)?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title="Home" subtitle={`${greeting}. Want to talk?`}>
      <Card className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-ink/75">Hi Ramesh ji</p>
            <p className="mt-1 text-sm text-ink/60">I’m your friendly voice companion. No typing needed.</p>
          </div>
          <div ref={stickerRef} className="h-14 w-14 shrink-0">
            <ElderSticker className="h-14 w-14" tone="sky" />
          </div>
        </div>
        <MicButton speaking={speaking} busy={busy} onToggle={runVoice} />

        {(lastUser || lastBot || error) && (
          <div className="mt-3 rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            {error ? (
              <p className="text-sm font-semibold text-danger">{error}</p>
            ) : (
              <>
                {lastUser ? (
                  <p className="text-sm text-ink/70">
                    <span className="font-bold text-ink">You:</span> {lastUser}
                  </p>
                ) : null}
                {lastBot ? (
                  <p className="mt-2 text-base font-semibold text-ink">
                    <span className="font-extrabold">ElderMind:</span> {lastBot}
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Today’s gentle check-in</p>
            <p className="mt-1 text-sm text-ink/60">One small question at a time.</p>
          </div>
          <div className="h-10 w-10">
            <SparkleSticker className="h-10 w-10" />
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          <PressableButton variant="soft" size="lg" className="text-left">
            “How are you feeling right now?”
          </PressableButton>
          <PressableButton variant="soft" size="lg" className="text-left">
            “Did you drink some water today?”
          </PressableButton>
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Quick screens</p>
        <p className="mt-1 text-sm text-ink/60">Big buttons. Easy to find.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href="/medication.html" className="block">
            <PressableButton className="w-full" variant="primary" size="lg">
              Medicines
            </PressableButton>
          </a>
          <a href="/activity.html" className="block">
            <PressableButton className="w-full" variant="soft" size="lg">
              Activity
            </PressableButton>
          </a>
          <a href="/summary.html" className="block">
            <PressableButton className="w-full" variant="soft" size="lg">
              Weekly
            </PressableButton>
          </a>
          <a href="/alert.html" className="block">
            <PressableButton className="w-full" variant="danger" size="lg">
              Emergency
            </PressableButton>
          </a>
          <a href="/caregiver.html" className="block">
            <PressableButton className="w-full" variant="soft" size="lg">
              Caregiver
            </PressableButton>
          </a>
        </div>
      </Card>
    </AppShell>
  )
}

