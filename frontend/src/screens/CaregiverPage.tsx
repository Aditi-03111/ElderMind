import { useEffect, useState } from 'react'
import { AppShell } from '../ui/AppShell'
import { Card } from '../ui/Card'
import { PressableButton } from '../ui/Pressable'
import { API_BASE } from '../lib/api'

type DashboardPayload = {
  caregiver_id: string
  user: { name: string; age: number; city: string; language: string }
  recent_conversations: Array<{ ts: string; text_input: string; ai_response: string; mood: string; emotion: string }>
  medicine_logs: Array<{ created_at: string; med_id: string; status: string; confirmed_time: string }>
  alerts: Array<{ time_created: string; type: string; severity: number; message: string }>
}

export function CaregiverPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<DashboardPayload | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${API_BASE}/dashboard/kiran`)
      if (!res.ok) throw new Error(`Dashboard failed: ${res.status}`)
      setData((await res.json()) as DashboardPayload)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <AppShell
      title="Caregiver"
      subtitle={data ? `${data.user.name}, ${data.user.age} • ${data.user.city}` : 'Caregiver dashboard'}
    >
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Live snapshot</p>
            <p className="mt-1 text-sm text-ink/60">
              {loading ? 'Loading…' : error ? 'Backend not reachable.' : 'Up to date.'}
            </p>
          </div>
          <PressableButton variant="soft" size="md" onClick={load} disabled={loading}>
            Refresh
          </PressableButton>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Alerts</p>
        <p className="mt-1 text-sm text-ink/60">Higher severity shows first.</p>
        <div className="mt-3 space-y-2">
          {(data?.alerts || [])
            .slice()
            .sort((a, b) => b.severity - a.severity)
            .slice(0, 6)
            .map((a, i) => (
              <div
                key={`${a.time_created}-${i}`}
                className={[
                  'rounded-2xl p-3 shadow-soft ring-1 ring-black/5',
                  a.severity >= 80 ? 'bg-rose/15' : a.severity >= 60 ? 'bg-lemon/20' : 'bg-white/70',
                ].join(' ')}
              >
                <p className="text-sm font-extrabold text-ink">
                  {a.type.toUpperCase()} • severity {a.severity}
                </p>
                <p className="mt-1 text-sm text-ink/65">{a.message}</p>
              </div>
            ))}
          {!loading && !error && (data?.alerts?.length ?? 0) === 0 ? (
            <div className="rounded-2xl bg-mint/15 p-3 shadow-soft ring-1 ring-black/5">
              <p className="text-sm font-semibold text-ink">All calm. No alerts right now.</p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Recent medicines</p>
        <div className="mt-3 space-y-2">
          {(data?.medicine_logs || []).slice(-6).reverse().map((m, i) => (
            <div key={`${m.created_at}-${i}`} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
              <p className="text-sm font-extrabold text-ink">
                {m.med_id} • {m.status}
              </p>
              <p className="mt-1 text-sm text-ink/60">{m.confirmed_time || m.created_at}</p>
            </div>
          ))}
          {!loading && !error && (data?.medicine_logs?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink/60">No medicine logs yet.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Recent conversation</p>
        <div className="mt-3 space-y-2">
          {(data?.recent_conversations || []).slice(-4).reverse().map((c, i) => (
            <div key={`${c.ts}-${i}`} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
              <p className="text-sm text-ink/70">
                <span className="font-extrabold text-ink">User:</span> {c.text_input}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                <span className="font-extrabold">ElderMind:</span> {c.ai_response}
              </p>
              <p className="mt-2 text-xs font-bold tracking-wide text-ink/55">
                mood {c.mood} • emotion {c.emotion}
              </p>
            </div>
          ))}
          {!loading && !error && (data?.recent_conversations?.length ?? 0) === 0 ? (
            <p className="text-sm text-ink/60">No conversations yet.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Quick actions</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <PressableButton variant="primary" size="lg">
            Call now
          </PressableButton>
          <PressableButton variant="soft" size="lg">
            Send message
          </PressableButton>
        </div>
        <p className="mt-2 text-xs text-ink/55">
          (Demo buttons — hook these to Twilio/WhatsApp when you add real credentials.)
        </p>
      </Card>
    </AppShell>
  )
}

