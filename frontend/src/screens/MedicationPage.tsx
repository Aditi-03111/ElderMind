import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { AppShell } from '../ui/AppShell'
import { Card } from '../ui/Card'
import { PressableButton } from '../ui/Pressable'
import { PillSticker } from '../ui/stickers'

type Med = {
  id: string
  name: string
  dose: string
  time: string
  note: string
}

const meds: Med[] = [
  { id: 'aspirin', name: 'Aspirin', dose: '100 mg', time: '8:00 AM', note: 'With water' },
  { id: 'bp', name: 'BP tablet', dose: '10 mg', time: '2:00 PM', note: 'After lunch' },
  { id: 'sugar', name: 'Sugar tablet', dose: '5 mg', time: '8:00 PM', note: 'With food' },
]

export function MedicationPage() {
  const [taken, setTaken] = useState<Record<string, boolean>>({ aspirin: true })
  const listRef = useRef<HTMLDivElement | null>(null)

  const nextUp = useMemo(() => meds.find((m) => !taken[m.id]) ?? meds[1], [taken])

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('[data-med-row]'),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.06 },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  const toggleTaken = (id: string) => {
    setTaken((t) => {
      const next = { ...t, [id]: !t[id] }
      return next
    })
  }

  return (
    <AppShell title="Medicines" subtitle="Gentle reminders, big buttons.">
      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Next up</p>
            <p className="mt-1 text-sm text-ink/60">We’ll keep it calm and simple.</p>
            <div className="mt-3 rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
              <p className="text-base font-bold text-ink">
                {nextUp.name} <span className="font-semibold text-ink/60">• {nextUp.dose}</span>
              </p>
              <p className="mt-1 text-sm text-ink/60">
                {nextUp.time} • {nextUp.note}
              </p>
            </div>
          </div>
          <div className="h-14 w-14 shrink-0">
            <PillSticker className="h-14 w-14" />
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Today</p>
        <p className="mt-1 text-sm text-ink/60">Tap once to mark taken.</p>

        <div ref={listRef} className="mt-3 space-y-2">
          {meds.map((m) => {
            const isTaken = Boolean(taken[m.id])
            return (
              <div
                key={m.id}
                data-med-row
                className={[
                  'rounded-2xl p-3 ring-1 ring-black/5 shadow-soft',
                  isTaken ? 'bg-mint/15' : 'bg-white/65',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-extrabold tracking-tight text-ink">
                      {m.name} <span className="font-semibold text-ink/55">• {m.dose}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink/60">
                      {m.time} • {m.note}
                    </p>
                  </div>

                  <PressableButton
                    variant={isTaken ? 'primary' : 'soft'}
                    size="md"
                    onClick={() => toggleTaken(m.id)}
                    className="shrink-0 px-4"
                    aria-label={isTaken ? `Mark ${m.name} as not taken` : `Mark ${m.name} as taken`}
                  >
                    {isTaken ? 'Taken ✓' : 'Take now'}
                  </PressableButton>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">If you missed one</p>
        <p className="mt-1 text-sm text-ink/60">No stress. We’ll remind you gently again.</p>
        <div className="mt-3 grid gap-2">
          <PressableButton size="lg" variant="soft">
            Remind me in 10 minutes
          </PressableButton>
          <PressableButton size="lg" variant="soft">
            Tell Kiran to check in
          </PressableButton>
        </div>
      </Card>
    </AppShell>
  )
}

