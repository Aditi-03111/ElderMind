import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { AppShell } from '../ui/AppShell'
import { AuthPanel } from '../ui/AuthPanel'
import { Card } from '../ui/Card'
import { PressableButton } from '../ui/Pressable'
import { HeartPulseSticker } from '../ui/stickers'
import { analyzeRppgVideo, callContact, getActivity, postVoice, sendSos, type ActivitySummary, type AppSession, type RppgAnalysis } from '../lib/api'
import { getStoredSession } from '../lib/session'


export function AlertPage() {
  const [session] = useState<AppSession | null>(() => getStoredSession())
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [activity, setActivity] = useState<ActivitySummary | null>(null)
  const [rppgBusy, setRppgBusy] = useState(false)
  const [rppgResult, setRppgResult] = useState<RppgAnalysis | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!session) return
    void getActivity(session.user_id).then(setActivity).catch(() => {})
  }, [session])

  useLayoutEffect(() => {
    const el = buttonRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      if (armed) gsap.fromTo(el, { rotate: -1.2 }, { rotate: 1.2, duration: 0.08, repeat: 8, yoyo: true })
      else gsap.to(el, { rotate: 0, duration: 0.2 })
    }, el)
    return () => ctx.revert()
  }, [armed])

  const sendQuickVoice = async (text: string) => {
    if (!session) return
    try {
      setBusy(true)
      const res = await postVoice({ user_id: session.user_id, text })
      setResult(res.text)
    } catch (e: unknown) {
      setResult((e as { message?: string } | undefined)?.message || 'Could not reach the assistant')
    } finally {
      setBusy(false)
    }
  }

  const doCall = async () => {
    if (!session) return
    try {
      const res = await callContact({ user_id: session.user_id })
      if (res.mode === 'fallback') window.location.href = `tel:${res.target}`
      else setResult(`Calling ${res.label} now.`)
    } catch (e: unknown) {
      setResult((e as { message?: string } | undefined)?.message || 'Could not place a call')
    }
  }

  const handleRppgUpload = async (file: File) => {
    if (!session) return
    try {
      setRppgBusy(true)
      setResult('')
      const analysis = await analyzeRppgVideo(session.user_id, file)
      setRppgResult(analysis)
      setActivity(await getActivity(session.user_id))
    } catch (e: unknown) {
      setResult((e as { message?: string } | undefined)?.message || 'Could not run the camera wellness check')
    } finally {
      setRppgBusy(false)
    }
  }

  if (!session) {
    return (
      <AppShell title="Health" subtitle="Login required." showNav={false}>
        <AuthPanel onReady={() => window.location.reload()} />
      </AppShell>
    )
  }

  return (
    <AppShell title="Health" subtitle="Status, support, and emergency help in one place.">
      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Current status</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Mood</p>
            <p className="mt-1 text-xl font-extrabold tracking-tight text-ink">{activity?.mood || 'okay'}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-bold tracking-wide text-ink/60">Status</p>
            <p className="mt-1 text-xl font-extrabold tracking-tight text-ink">{activity?.status || 'steady'}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Camera wellness check</p>
            <p className="mt-1 text-sm text-ink/60">
              Upload a short face video and Bhumi will estimate an experimental pulse and show the raw BVP signal.
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">Experimental only · not medical</p>
          </div>
          <div className="rounded-2xl bg-rose/10 p-2 ring-1 ring-black/5">
            <HeartPulseSticker className="h-12 w-12" />
          </div>
        </div>

        <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-white/70 px-4 py-6 text-sm font-semibold text-ink/70 shadow-soft">
          <input
            type="file"
            accept="video/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleRppgUpload(file)
              e.currentTarget.value = ''
            }}
          />
          {rppgBusy ? 'Analyzing face video...' : 'Choose or record a face video'}
        </label>

        {rppgResult ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                <p className="text-xs font-bold tracking-wide text-ink/60">Estimated pulse</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{Math.round(rppgResult.bpm)} BPM</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                <p className="text-xs font-bold tracking-wide text-ink/60">Signal quality</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{rppgResult.sqi.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-sm text-ink/70">{rppgResult.note}</p>
            <p className="text-xs text-ink/55">{rppgResult.medical_notice}</p>
            <img
              src={rppgResult.plot_url}
              alt="Raw BVP signal"
              className="w-full rounded-2xl bg-white object-cover ring-1 ring-black/5"
            />
          </div>
        ) : null}
      </Card>

      <Card className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Need help?</p>
            <p className="mt-1 text-sm text-ink/60">This will alert your support circle and share your location if it is allowed in settings.</p>
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
            onClick={() => {
              setResult('')
              setArmed(true)
            }}
            disabled={busy}
          >
            SOS - Call for help
          </PressableButton>

          {armed ? (
            <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
              <p className="text-base font-extrabold text-ink">Confirm SOS?</p>
              <p className="mt-1 text-sm text-ink/60">We will do this quickly and gently.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PressableButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    ;(async () => {
                      try {
                        setBusy(true)
                        const loc =
                          'geolocation' in navigator
                            ? await new Promise<{ lat: number; lng: number } | undefined>((resolve) => {
                                navigator.geolocation.getCurrentPosition(
                                  (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
                                  () => resolve(undefined),
                                  { enableHighAccuracy: false, timeout: 2000 },
                                )
                              })
                            : undefined
                        const res = await sendSos({ user_id: session.user_id, reason: 'SOS pressed', location: loc, severity: 90 })
                        const callRes = await callContact({ user_id: session.user_id })
                        if (callRes.mode === 'fallback') window.location.href = `tel:${callRes.target}`
                        setResult(`${res.message} (severity ${res.severity}). Calling ${callRes.label} too.`)
                        setArmed(false)
                      } catch (e: unknown) {
                        setResult((e as { message?: string } | undefined)?.message || 'SOS failed')
                      } finally {
                        setBusy(false)
                      }
                    })()
                  }}
                >
                  {busy ? 'Sending...' : 'Yes, send'}
                </PressableButton>
                <PressableButton variant="soft" size="lg" onClick={() => setArmed(false)}>
                  Cancel
                </PressableButton>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink/60">If it is not urgent, you can also use the calm help buttons below.</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <PressableButton variant="soft" onClick={() => void doCall()} disabled={busy}>
              Call support
            </PressableButton>
            <PressableButton variant="soft" onClick={() => (window.location.href = '/support.html')}>
              Open support page
            </PressableButton>
          </div>

          {result ? (
            <div className="rounded-2xl bg-mint/15 p-3 shadow-soft ring-1 ring-black/5">
              <p className="text-sm font-semibold text-ink">{result}</p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Quick calm steps</p>
        <div className="mt-3 grid gap-2">
          <PressableButton size="lg" variant="soft" onClick={() => void sendQuickVoice('I feel dizzy')}>
            I feel dizzy
          </PressableButton>
          <PressableButton size="lg" variant="soft" onClick={() => void sendQuickVoice('Chest feels uncomfortable')}>
            Chest feels uncomfortable
          </PressableButton>
          <PressableButton size="lg" variant="soft" onClick={() => void sendQuickVoice('I had a fall')}>
            I had a fall
          </PressableButton>
        </div>
      </Card>
    </AppShell>
  )
}
