import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../ui/AppShell'
import { AuthPanel } from '../ui/AuthPanel'
import { Card } from '../ui/Card'
import { PressableButton } from '../ui/Pressable'
import { clearConversationHistory, clearMemories, createAlarm, deleteAlarm, deleteConversationDay, deleteConversationItem, getAlarms, getConversationHistory, getUserProfile, updateUserProfile, type AlarmItem, type AppSession, type ConversationItem, type UserProfile } from '../lib/api'
import { regionalLanguages } from '../lib/regionalLanguages'
import { clearStoredSession, getStoredSession } from '../lib/session'

function familyContactsText(profile: UserProfile | null) {
  return (profile?.family_contacts || [])
    .map((item) => [item.name || '', item.relation || item.role || '', item.phone || ''].join(' | '))
    .join('\n')
}

function parseFamilyContacts(value: string): NonNullable<UserProfile['family_contacts']> {
  return value
    .split('\n')
    .map((line, index) => {
      const [name, relation, phone] = line.split('|').map((item) => item.trim())
      if (!name && !phone) return null
      return {
        id: `family-${index + 1}`,
        name: name || relation || `Family ${index + 1}`,
        relation: relation || 'family',
        role: relation || 'family',
        phone: phone || '',
      }
    })
    .filter(Boolean) as NonNullable<UserProfile['family_contacts']>
}

export function SettingsPage() {
  const [session] = useState<AppSession | null>(() => getStoredSession())
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [history, setHistory] = useState<ConversationItem[]>([])
  const [saving, setSaving] = useState(false)
  const [historyBusy, setHistoryBusy] = useState('')
  const [locationBusy, setLocationBusy] = useState(false)
  const [alarms, setAlarms] = useState<AlarmItem[]>([])
  const [alarmTitle, setAlarmTitle] = useState('Alarm')
  const [alarmTime, setAlarmTime] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    if (!session) return
    const [user, items, alarmItems] = await Promise.all([getUserProfile(session.user_id), getConversationHistory(session.user_id, 20), getAlarms(session.user_id)])
    setProfile(user)
    setHistory(items)
    setAlarms(alarmItems)
  }

  useEffect(() => {
    if (!session) return
    void load().catch((e: unknown) => setError((e as { message?: string } | undefined)?.message || 'Could not load settings'))
  }, [session])

  const historyGroups = useMemo(() => {
    const groups = new Map<string, ConversationItem[]>()
    for (const item of history) {
      const key = String(item.ts || '').slice(0, 10) || 'Unknown day'
      const bucket = groups.get(key) || []
      bucket.push(item)
      groups.set(key, bucket)
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, items]) => ({ day, items: items.slice().sort((a, b) => String(b.ts).localeCompare(String(a.ts))) }))
  }, [history])

  const removeItem = async (itemId: string) => {
    if (!session) return
    try {
      setHistoryBusy(itemId)
      await deleteConversationItem(session.user_id, itemId)
      await load()
    } finally {
      setHistoryBusy('')
    }
  }

  const removeDay = async (dayKey: string) => {
    if (!session) return
    try {
      setHistoryBusy(dayKey)
      await deleteConversationDay(session.user_id, dayKey)
      await load()
    } finally {
      setHistoryBusy('')
    }
  }

  const fetchCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser')
      return
    }
    try {
      setLocationBusy(true)
      setError('')
      const coords = await new Promise<{ lat: number; lon: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
        )
      })
      setProfile((current) => (current ? { ...current, lat: coords.lat, lon: coords.lon } : current))
      setMessage('Current location fetched. Save settings to keep it.')
    } catch {
      setError('Could not fetch current location')
    } finally {
      setLocationBusy(false)
    }
  }

  const save = async () => {
    if (!session || !profile) return
    try {
      setSaving(true)
      setError('')
      setMessage('')
      const user = await updateUserProfile(session.user_id, profile)
      setProfile(user)
      setMessage('Settings saved.')
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  const addManualAlarm = async () => {
    if (!session || !alarmTime) return
    try {
      const now = new Date()
      const [hourPart, minutePart] = alarmTime.split(':').map((item) => Number(item))
      if (Number.isNaN(hourPart) || Number.isNaN(minutePart)) {
        setError('Please choose a valid alarm time')
        return
      }
      const when = new Date(now)
      when.setSeconds(0, 0)
      when.setHours(hourPart, minutePart, 0, 0)
      if (when.getTime() <= now.getTime()) when.setDate(when.getDate() + 1)
      await createAlarm(session.user_id, {
        title: alarmTitle || 'Alarm',
        time_iso: when.toISOString(),
        label: alarmTitle || 'Alarm',
        source: 'manual',
      })
      setAlarmTime('')
      setAlarmTitle('Alarm')
      setMessage('Alarm added.')
      await load()
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not add alarm')
    }
  }

  if (!session) {
    return (
      <AppShell title="Settings" subtitle="Login required." showNav={false}>
        <AuthPanel onReady={() => window.location.reload()} />
      </AppShell>
    )
  }

  return (
    <AppShell title="Settings" subtitle="Profile, language, support circle, and assistant controls.">
      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Account</p>
        <div className="mt-3 rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-semibold text-ink">{session.email || 'Signed in'}</p>
          <p className="mt-1 text-sm text-ink/60">Role: {session.role === 'support' ? 'Support' : 'Elder'}</p>
        </div>
        <div className="mt-3">
          <PressableButton
            variant="soft"
            size="lg"
            onClick={() => {
              clearStoredSession()
              window.location.reload()
            }}
          >
            Sign out
          </PressableButton>
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Profile</p>
        <div className="mt-3 space-y-2">
          {[
            ['Name', 'name'],
            ['Region', 'region'],
            ['City', 'city'],
            ['Origin', 'origin'],
            ['Wake Time', 'wake_time'],
            ['Sleep Time', 'sleep_time'],
            ['Phone', 'phone'],
            ['Primary Support Name', 'caretaker_name'],
            ['Primary Support Phone', 'caretaker_phone'],
          ].map(([label, key]) => (
            <label key={key} className="block text-sm font-semibold text-ink/70">
              <span>{label}</span>
              <input
                value={String((profile as Record<string, unknown> | null)?.[key] || '')}
                onChange={(e) => setProfile((current) => (current ? { ...current, [key]: e.target.value } : current))}
                className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
              />
            </label>
          ))}
          <label className="block text-sm font-semibold text-ink/70">
            <span>Regional language</span>
            <select
              value={profile?.language || 'English'}
              onChange={(e) => setProfile((current) => (current ? { ...current, language: e.target.value } : current))}
              className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
            >
              {regionalLanguages.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-ink">Saved location</p>
                <p className="mt-1 text-sm text-ink/60">
                  {profile?.lat != null && profile?.lon != null ? `${profile.lat}, ${profile.lon}` : 'No saved coordinates yet'}
                </p>
              </div>
              <PressableButton variant="soft" size="md" onClick={() => void fetchCurrentLocation()} disabled={locationBusy}>
                {locationBusy ? 'Fetching...' : 'Use current'}
              </PressableButton>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Support circle</p>
        <p className="mt-1 text-sm text-ink/60">One contact per line. Use: name | relation | phone</p>
        <textarea
          rows={5}
          value={familyContactsText(profile)}
          onChange={(e) =>
            setProfile((current) =>
              current
                ? {
                    ...current,
                    family_contacts: parseFamilyContacts(e.target.value),
                  }
                : current,
            )
          }
          placeholder={'Kiran | son | +91-9999999999\nAnita | daughter | +91-9888888888'}
          className="mt-3 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
        />
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Assistant settings</p>
        <div className="mt-3 space-y-3">
          {[
            ['History enabled', 'history_enabled'],
            ['Location enabled', 'location_enabled'],
            ['Wake word enabled', 'wake_word_enabled'],
            ['Auto send on pause', 'auto_send_on_pause'],
          ].map(([label, key]) => (
            <label key={key} className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-3 shadow-soft ring-1 ring-black/5">
              <span className="text-sm font-semibold text-ink/70">{label}</span>
              <input
                type="checkbox"
                checked={Boolean(profile?.settings?.[key as keyof NonNullable<UserProfile['settings']>])}
                onChange={(e) =>
                  setProfile((current) =>
                    current
                      ? {
                          ...current,
                          settings: {
                            ...current.settings,
                            [key]: e.target.checked,
                          },
                        }
                      : current,
                  )
                }
              />
            </label>
          ))}
          <label className="block text-sm font-semibold text-ink/70">
            <span>Wake words (comma separated)</span>
            <input
              value={(profile?.settings?.wake_words || []).join(', ')}
              onChange={(e) =>
                setProfile((current) =>
                  current
                    ? {
                        ...current,
                        settings: {
                          ...current.settings,
                          wake_words: e.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                        },
                      }
                    : current,
                )
              }
              className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
            />
          </label>
          <label className="block text-sm font-semibold text-ink/70">
            <span>Preferences (comma separated)</span>
            <input
              value={(profile?.preferences || []).join(', ')}
              onChange={(e) =>
                setProfile((current) =>
                  current
                    ? {
                        ...current,
                        preferences: e.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                      }
                    : current,
                )
              }
              className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
            />
          </label>
        </div>
        <div className="mt-3">
          <PressableButton variant="primary" size="lg" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </PressableButton>
        </div>
        {message ? <p className="mt-2 text-sm font-semibold text-ink/70">{message}</p> : null}
        {error ? <p className="mt-2 text-sm font-semibold text-danger">{error}</p> : null}
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Alarms and reminders</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,160px,auto]">
          <input
            value={alarmTitle}
            onChange={(e) => setAlarmTitle(e.target.value)}
            placeholder="Alarm label"
            className="rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
          />
          <input
            type="time"
            value={alarmTime}
            onChange={(e) => setAlarmTime(e.target.value)}
            className="rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
          />
          <PressableButton variant="primary" size="lg" onClick={() => void addManualAlarm()}>
            Add alarm
          </PressableButton>
        </div>
        <div className="mt-3 space-y-2">
          {alarms.map((alarm) => (
            <div key={alarm.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
              <div>
                <p className="text-sm font-extrabold text-ink">{alarm.title}</p>
                <p className="mt-1 text-sm text-ink/60">{new Date(alarm.time_iso).toLocaleString()}</p>
              </div>
              <PressableButton variant="soft" size="md" onClick={() => session && void deleteAlarm(session.user_id, alarm.id).then(() => load())}>
                Delete
              </PressableButton>
            </div>
          ))}
          {!alarms.length ? <p className="text-sm text-ink/60">No alarms yet.</p> : null}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Daily chat history</p>
        <p className="mt-1 text-sm text-ink/60">This updates from saved conversations and is grouped by day.</p>
        <div className="mt-3 grid gap-2">
          {historyGroups.map((group) => (
            <div key={group.day} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-ink">{group.day}</p>
                  <p className="mt-1 text-xs font-semibold tracking-wide text-ink/55">{group.items.length} chats</p>
                </div>
                <PressableButton variant="soft" size="md" onClick={() => void removeDay(group.day)} disabled={historyBusy === group.day}>
                  {historyBusy === group.day ? 'Deleting...' : 'Delete day'}
                </PressableButton>
              </div>
              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white/80 p-3 ring-1 ring-black/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold tracking-wide text-ink/55">
                          {(item.ts || '').replace('T', ' ').slice(0, 16)}
                        </p>
                        <p className="mt-1 text-sm text-ink/70">
                          <span className="font-bold text-ink">You:</span> {item.text_input}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-ink">
                          <span className="font-extrabold">ElderMind:</span> {item.ai_response}
                        </p>
                      </div>
                      <PressableButton variant="soft" size="md" onClick={() => void removeItem(item.id)} disabled={historyBusy === item.id}>
                        {historyBusy === item.id ? '...' : 'Delete'}
                      </PressableButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!historyGroups.length ? <p className="text-sm text-ink/60">No stored chat history yet.</p> : null}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Privacy reset</p>
        <div className="mt-3 grid gap-2">
          <PressableButton
            variant="soft"
            onClick={() => {
              if (!session) return
              void clearConversationHistory(session.user_id).then(() => load())
            }}
          >
            Clear conversation history
          </PressableButton>
          <PressableButton
            variant="soft"
            onClick={() => {
              if (!session) return
              void clearMemories(session.user_id).then(() => load())
            }}
          >
            Clear stored memories
          </PressableButton>
        </div>
        <p className="mt-3 text-sm text-ink/60">Stored messages: {history.length}</p>
      </Card>
    </AppShell>
  )
}
