import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { AppShell } from '../ui/AppShell'
import { Card } from '../ui/Card'
import { PressableButton } from '../ui/Pressable'
import { SparkleSticker } from '../ui/stickers'
import { getWeeklyReport } from '../lib/api'

export function SummaryPage() {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState('')
  const barsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const r = await getWeeklyReport('demo')
        setReport(r)
      } catch (e: any) {
        setError(e?.message || 'Failed to load report')
      } finally {
        window.setTimeout(() => setLoading(false), 450)
      }
    })()
  }, [])

  useLayoutEffect(() => {
    const el = barsRef.current
    if (!el || loading) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('[data-bar]'),
        { scaleY: 0.3, opacity: 0.2 },
        { scaleY: 1, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'elastic.out(1,0.6)' },
      )
    }, el)
    return () => ctx.revert()
  }, [loading])

  const moodBars = [0.7, 0.8, 0.65, 0.78, 0.83, 0.76, 0.81]

  return (
    <AppShell title="Weekly" subtitle="A soft summary you can trust.">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Week of Apr 1–7</p>
            <p className="mt-1 text-sm text-ink/60">Short. Clear. No scary words.</p>
          </div>
          <div className="h-14 w-14 shrink-0">
            <SparkleSticker className="h-14 w-14" />
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold text-ink/70">Mood trend</p>
          {loading ? (
            <div className="mt-3 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl2 bg-ink/5 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="mt-3 text-sm font-semibold text-danger">{error}</p>
          ) : (
            <div ref={barsRef} className="mt-3 grid grid-cols-7 items-end gap-2">
              {moodBars.map((m, i) => (
                <div
                  key={i}
                  data-bar
                  style={{ height: `${Math.round(46 + m * 46)}px` }}
                  className={[
                    'origin-bottom rounded-xl2 shadow-soft ring-1 ring-black/5',
                    i === 6 ? 'bg-mint/35' : 'bg-sky/28',
                  ].join(' ')}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Highlights</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Medicines</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              {report?.medicine_adherence ?? 95}%
            </p>
            <p className="mt-1 text-sm text-ink/60">Great routine.</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Activity</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              {report?.activity_steps_per_day ? `${Math.round(report.activity_steps_per_day / 100) / 10}k` : '4.2k'}
            </p>
            <p className="mt-1 text-sm text-ink/60">Steps/day.</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Sleep</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              {report?.sleep_hours ?? 7.5}h
            </p>
            <p className="mt-1 text-sm text-ink/60">Stable.</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Alerts</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">0</p>
            <p className="mt-1 text-sm text-ink/60">All calm.</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Gentle suggestions</p>
        <p className="mt-1 text-sm text-ink/60">Small steps that feel doable.</p>
        <div className="mt-3 grid gap-2">
          {(report?.recommendations?.length ? report.recommendations : [
            '10-minute walk after lunch',
            'Call a friend for 5 minutes',
            'Play a short prayer / story',
          ]).slice(0, 3).map((r: string) => (
            <PressableButton key={r} size="lg" variant="soft">
              {r}
            </PressableButton>
          ))}
        </div>
      </Card>
    </AppShell>
  )
}

