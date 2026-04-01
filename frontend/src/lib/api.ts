export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export type VoiceResponse = {
  status: 'success'
  text: string
  mood: 'good' | 'okay' | 'low' | 'anxious'
  emotion: string
  timestamp: string
  alert_sent: boolean
  alert_severity: number
}

export async function postVoice({
  user_id,
  text,
  mood_hint,
  lat,
  lon,
}: {
  user_id: string
  text: string
  mood_hint?: VoiceResponse['mood']
  lat?: number
  lon?: number
}): Promise<VoiceResponse> {
  const res = await fetch(`${API_BASE}/voice`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user_id, text, mood_hint, lat, lon }),
  })
  if (!res.ok) throw new Error(`Voice request failed: ${res.status}`)
  return (await res.json()) as VoiceResponse
}

export type WeeklyReport = {
  week_start: string
  week_end: string
  mood_score: number
  activity_steps_per_day: number
  medicine_adherence: number
  sleep_hours: number
  health_issues: string[]
  recommendations: string[]
}

export async function getWeeklyReport(user_id: string): Promise<WeeklyReport> {
  const res = await fetch(`${API_BASE}/report/weekly/${encodeURIComponent(user_id)}`)
  if (!res.ok) throw new Error(`Weekly report failed: ${res.status}`)
  return (await res.json()) as WeeklyReport
}

export async function sendSos({
  user_id,
  reason,
  location,
}: {
  user_id: string
  reason?: string
  location?: unknown
}) {
  const res = await fetch(`${API_BASE}/sos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user_id, reason, location }),
  })
  if (!res.ok) throw new Error(`SOS failed: ${res.status}`)
  return (await res.json()) as {
    status: 'success'
    alerts_sent_to: string[]
    timestamp: string
    severity: number
    message: string
  }
}

