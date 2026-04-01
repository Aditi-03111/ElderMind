import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { AppShell } from '../ui/AppShell'
import { Card } from '../ui/Card'
import { PressableButton } from '../ui/Pressable'
import { HeartPulseSticker } from '../ui/stickers'

export function AlertPage() {
  const [armed, setArmed] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useLayoutEffect(() => {
    const el = buttonRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      if (armed) {
        gsap.fromTo(el, { rotate: -1.2 }, { rotate: 1.2, duration: 0.08, repeat: 8, yoyo: true })
      } else {
        gsap.to(el, { rotate: 0, duration: 0.2 })
      }
    }, el)
    return () => ctx.revert()
  }, [armed])

  return (
    <AppShell title="Emergency" subtitle="Stay calm. Help is one tap away.">
      <Card className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Need help?</p>
            <p className="mt-1 text-sm text-ink/60">
              This will alert your caregiver and show your location (if allowed).
            </p>
          </div>
          <div className="h-14 w-14 shrink-0 animate-slowGlow">
            <HeartPulseSticker className="h-14 w-14" />
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <PressableButton
            ref={buttonRef}
            variant="danger"
            size="lg"
            className="py-5 text-xl"
            onClick={() => setArmed(true)}
          >
            SOS • Call for help
          </PressableButton>

          {armed ? (
            <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
              <p className="text-base font-extrabold text-ink">Confirm SOS?</p>
              <p className="mt-1 text-sm text-ink/60">We’ll do this gently and quickly.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PressableButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setArmed(false)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    alert('Demo: SOS sent to Kiran. (Hook this to your backend/Twilio)')
                  }}
                >
                  Yes, send
                </PressableButton>
                <PressableButton variant="soft" size="lg" onClick={() => setArmed(false)}>
                  Cancel
                </PressableButton>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink/60">
              If you’re not sure, you can also ask ElderMind on Home with the microphone.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Quick calm steps</p>
        <div className="mt-3 grid gap-2">
          <PressableButton size="lg" variant="soft">
            I feel dizzy
          </PressableButton>
          <PressableButton size="lg" variant="soft">
            Chest feels uncomfortable
          </PressableButton>
          <PressableButton size="lg" variant="soft">
            I had a fall
          </PressableButton>
        </div>
      </Card>
    </AppShell>
  )
}

