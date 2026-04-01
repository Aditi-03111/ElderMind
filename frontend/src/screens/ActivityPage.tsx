import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { AppShell } from '../ui/AppShell'
import { Card } from '../ui/Card'
import { PressableButton } from '../ui/Pressable'
import { SparkleSticker } from '../ui/stickers'

type Status = 'good' | 'okay' | 'watch'

function StatusDot({ status }: { status: Status }) {
  const ref = useRef<HTMLSpanElement | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scale: 0.92, opacity: 0.75 },
        { scale: 1.08, opacity: 1, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  const color =
    status === 'good' ? 'bg-mint' : status === 'okay' ? 'bg-lemon' : 'bg-rose'

  return (
    <span className="relative inline-flex h-3 w-3 items-center justify-center">
      <span ref={ref} className={['absolute h-3 w-3 rounded-full', color].join(' ')} />
      <span className="absolute h-6 w-6 rounded-full bg-white/30 ring-1 ring-black/5" />
    </span>
  )
}

export function ActivityPage() {
  const [status, setStatus] = useState<Status>('good')

  const summary = useMemo(() => {
    if (status === 'good') return 'You’re doing well today.'
    if (status === 'okay') return 'All okay. Let’s take it slow.'
    return 'A gentle watch: maybe drink water and rest.'
  }, [status])

  const panelRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      if (status === 'watch') {
        gsap.fromTo(el, { x: -2 }, { x: 2, duration: 0.08, repeat: 5, yoyo: true })
      }
    }, el)
    return () => ctx.revert()
  }, [status])

  return (
    <AppShell title="Activity" subtitle="Small signals, softly shown.">
      <Card>
        <div ref={panelRef} className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Right now</p>
            <p className="mt-1 text-sm text-ink/60">{summary}</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-soft ring-1 ring-black/5">
              <StatusDot status={status} />
              <span className="text-sm font-bold text-ink">
                {status === 'good' ? 'Green pulse' : status === 'okay' ? 'Gentle caution' : 'Keep an eye'}
              </span>
            </div>
          </div>
          <div className="h-14 w-14 shrink-0">
            <SparkleSticker className="h-14 w-14" />
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Today’s little wins</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Steps</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">4,200</p>
            <p className="mt-1 text-sm text-ink/60">Nice and steady.</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Sleep</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">7h 30m</p>
            <p className="mt-1 text-sm text-ink/60">Good rest.</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Water</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">5 cups</p>
            <p className="mt-1 text-sm text-ink/60">One more?</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Mood</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">🙂</p>
            <p className="mt-1 text-sm text-ink/60">Comfortable.</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Quick actions</p>
        <p className="mt-1 text-sm text-ink/60">Just one tap.</p>
        <div className="mt-3 grid gap-2">
          <PressableButton size="lg" variant="soft" onClick={() => setStatus('good')}>
            I feel okay
          </PressableButton>
          <PressableButton size="lg" variant="soft" onClick={() => setStatus('okay')}>
            A little tired
          </PressableButton>
          <PressableButton size="lg" variant="soft" onClick={() => setStatus('watch')}>
            Not feeling great
          </PressableButton>
        </div>
      </Card>
    </AppShell>
  )
}

