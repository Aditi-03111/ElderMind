import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { AppShell } from '../ui/AppShell'
import { Card } from '../ui/Card'
import { MicButton } from '../ui/MicButton'
import { PressableButton } from '../ui/Pressable'
import { ElderSticker, SparkleSticker } from '../ui/stickers'

export function HomePage() {
  const [speaking, setSpeaking] = useState(false)
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
        <MicButton speaking={speaking} onToggle={() => setSpeaking((s) => !s)} />
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
        </div>
      </Card>
    </AppShell>
  )
}

