import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../ui/AppShell'
import { AuthPanel } from '../ui/AuthPanel'
import { Card } from '../ui/Card'
import { PressableButton } from '../ui/Pressable'
import {
  addReport,
  analyzeReport,
  callContact,
  createAlarm,
  createCaretakerLogin,
  createManagedElder,
  deleteReport,
  getAudit,
  getSupportWorkspace,
  saveMedicines,
  syncMedicineReminders,
  testWhatsApp,
  updateUserProfile,
  type AlarmItem,
  type AppSession,
  type MedicineItem,
  type SupportWorkspace,
} from '../lib/api'
import { regionalLanguages } from '../lib/regionalLanguages'
import { getStoredSession } from '../lib/session'
import Tesseract from 'tesseract.js'

type ParentForm = {
  name: string
  user_id: string
  password: string
  email: string
  age: string
  language: string
  region: string
  city: string
  origin: string
  phone: string
  wake_time: string
  sleep_time: string
}

type CaretakerForm = {
  name: string
  email: string
  password: string
  phone: string
  relation: string
}

function emptyParentForm(): ParentForm {
  return {
    name: '',
    user_id: '',
    password: '',
    email: '',
    age: '68',
    language: 'Hindi',
    region: '',
    city: '',
    origin: '',
    phone: '',
    wake_time: '06:30',
    sleep_time: '21:30',
  }
}

function emptyCaretakerForm(): CaretakerForm {
  return {
    name: '',
    email: '',
    password: '',
    phone: '',
    relation: 'Caretaker',
  }
}

function blankMedicine(): MedicineItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    dose: '',
    times: ['08:00'],
    instructions: '',
    condition: '',
  }
}

function parsePreferences(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeParentUserId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CaregiverPage() {
  const [session] = useState<AppSession | null>(() => getStoredSession())
  const [workspace, setWorkspace] = useState<SupportWorkspace | null>(null)
  const [activeUserId, setActiveUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [parentLoginNotice, setParentLoginNotice] = useState('')
  const [parentForm, setParentForm] = useState<ParentForm>(() => emptyParentForm())
  const [caretakerForm, setCaretakerForm] = useState<CaretakerForm>(() => emptyCaretakerForm())
  const [reminderTitle, setReminderTitle] = useState('Medicine reminder')
  const [reminderTime, setReminderTime] = useState('')
  const [preferencesText, setPreferencesText] = useState('')
  const [medicines, setMedicines] = useState<MedicineItem[]>([])
  const [savingCarePlan, setSavingCarePlan] = useState(false)
  const [savingMedicine, setSavingMedicine] = useState(false)
  const [savingParent, setSavingParent] = useState(false)
  const [savingCaretaker, setSavingCaretaker] = useState(false)
  const [whatsAppBusy, setWhatsAppBusy] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)

  const accountId = session?.caregiver_id || ''
  const active = workspace?.active || null

  const load = async (nextActiveUserId = activeUserId) => {
    if (!accountId) return
    try {
      setLoading(true)
      setError('')
      const payload = await getSupportWorkspace(accountId, nextActiveUserId)
      setWorkspace(payload)
      const resolvedUserId = nextActiveUserId || payload.active?.user.user_id || payload.managed_users[0]?.user_id || ''
      setActiveUserId(resolvedUserId)
      if (payload.active?.user) {
        setPreferencesText((payload.active.user.preferences || []).join(', '))
        setMedicines(payload.active.medicines?.length ? payload.active.medicines : [])
        void getAudit(payload.active.user.user_id, 20)
      } else {
        setPreferencesText('')
        setMedicines([])
      }
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Failed to load family workspace')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accountId) return
    void load()
  }, [accountId])

  useEffect(() => {
    if (!accountId) return
    const timer = window.setInterval(() => {
      void load(activeUserId)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [accountId, activeUserId])

  useEffect(() => {
    if (!active?.user) return
    setPreferencesText((active.user.preferences || []).join(', '))
    setMedicines(active.medicines?.length ? active.medicines : [])
  }, [active?.user?.user_id, active?.medicines])

  const upcomingAlarms = useMemo(
    () => (active?.alarms || []).filter((item) => new Date(item.time_iso).getTime() >= Date.now()),
    [active?.alarms],
  )

  if (!session || session.role !== 'support') {
    return (
      <AppShell title="Family Hub" subtitle="Family manager login required." showNav={false}>
        <AuthPanel preferredRole="support" onReady={() => window.location.reload()} />
      </AppShell>
    )
  }

  const addParent = async () => {
    if (!accountId || !parentForm.name.trim()) return
    try {
      setSavingParent(true)
      setError('')
      setMessage('')
      setParentLoginNotice('')
      const created = await createManagedElder(accountId, {
        ...parentForm,
        age: Number(parentForm.age || 68),
      })
      const freshParentUserId = parentForm.user_id.trim()
      setParentForm(emptyParentForm())
      setMessage(`${created.user.name} added to your family hub.`)
      setParentLoginNotice(`Parent login ready: ${freshParentUserId} can now sign in with the password you just set.`)
      await load(created.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not add parent profile')
    } finally {
      setSavingParent(false)
    }
  }

  const addCaretaker = async () => {
    if (!accountId || !active?.user?.user_id) return
    try {
      setSavingCaretaker(true)
      setError('')
      setMessage('')
      await createCaretakerLogin(accountId, {
        user_id: active.user.user_id,
        ...caretakerForm,
      })
      setCaretakerForm(emptyCaretakerForm())
      setMessage('Caretaker login created.')
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not create caretaker login')
    } finally {
      setSavingCaretaker(false)
    }
  }

  const saveCarePlan = async () => {
    if (!active?.user?.user_id) return
    try {
      setSavingCarePlan(true)
      setError('')
      setMessage('')
      await updateUserProfile(active.user.user_id, {
        preferences: parsePreferences(preferencesText),
      })
      setMessage('Food and preference notes saved.')
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not save care plan')
    } finally {
      setSavingCarePlan(false)
    }
  }

  const saveMedicinePlan = async () => {
    if (!active?.user?.user_id) return
    try {
      setSavingMedicine(true)
      setError('')
      setMessage('')
      const normalized = medicines
        .filter((item) => item.name.trim())
        .map((item, index) => ({
          ...item,
          id: item.id || `med-${index + 1}`,
          times: (item.times || []).map((time) => time.trim()).filter(Boolean),
        }))
      await saveMedicines(active.user.user_id, normalized)
      await syncMedicineReminders(active.user.user_id)
      setMessage('Medicine plan updated and reminder times were synced from the medicine schedule.')
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not save medicines')
    } finally {
      setSavingMedicine(false)
    }
  }

  const addReminder = async () => {
    if (!active?.user?.user_id || !reminderTime) return
    try {
      setError('')
      setMessage('')
      const now = new Date()
      const [hourPart, minutePart] = reminderTime.split(':').map((item) => Number(item))
      const when = new Date(now)
      when.setSeconds(0, 0)
      when.setHours(hourPart, minutePart, 0, 0)
      if (when.getTime() <= now.getTime()) when.setDate(when.getDate() + 1)
      await createAlarm(active.user.user_id, {
        title: reminderTitle || 'Reminder',
        time_iso: when.toISOString(),
        label: reminderTitle || 'Reminder',
        source: 'family_manager',
      })
      setReminderTime('')
      setMessage('Reminder created. Bhumi will speak it on the parent device when it is due.')
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not create reminder')
    }
  }

  const runWhatsAppTest = async () => {
    if (!active?.user?.user_id) return
    try {
      setWhatsAppBusy(true)
      setError('')
      const result = await testWhatsApp({
        user_id: active.user.user_id,
        message: `Bhumi test for ${active.user.name}. This is a caretaker alert check.`,
      })
      setMessage(result.configured ? `WhatsApp test sent to ${result.target}.` : `WhatsApp fallback returned ${result.result}. Add Meta phone number config for live delivery.`)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'WhatsApp test failed')
    } finally {
      setWhatsAppBusy(false)
    }
  }

  const fileToDataUrl = async (file: File) =>
    await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Could not read the report image'))
      reader.readAsDataURL(file)
    })

  const uploadReport = async (file: File) => {
    if (!active?.user?.user_id) return
    try {
      setReportBusy(true)
      setError('')
      setMessage('')
      const imageDataUrl = await fileToDataUrl(file)
      const ocr = await Tesseract.recognize(file, 'eng')
      const ocrText = (ocr.data?.text || '').trim()
      const analysis = await analyzeReport({
        user_id: active.user.user_id,
        file_name: file.name,
        report_text: ocrText,
      })
      if ((analysis.suggested_medicines || []).length) {
        setMedicines((current) => {
          const existing = new Set(current.map((item) => `${item.name.toLowerCase()}::${item.dose.toLowerCase()}`))
          const imported = analysis.suggested_medicines
            .filter((item) => {
              const key = `${String(item.name || '').toLowerCase()}::${String(item.dose || '').toLowerCase()}`
              return item.name && item.dose && !existing.has(key)
            })
            .map((item) => ({
              id: crypto.randomUUID(),
              name: item.name || '',
              dose: item.dose || '',
              times: item.times?.length ? item.times : ['08:00'],
              instructions: item.instructions || '',
              condition: item.condition || '',
            }))
          return [...current, ...imported]
        })
      }
      await addReport(active.user.user_id, {
        file_name: file.name,
        mime_type: file.type || 'image/jpeg',
        image_data_url: imageDataUrl,
        ocr_text: ocrText,
        summary: analysis.summary,
        advice: analysis.advice,
      })
      setMessage(
        (analysis.suggested_medicines || []).length
          ? 'Report scanned. Medicines were pulled into the editable list below. Review and save to create reminders.'
          : 'Report scanned and saved.',
      )
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not scan the report')
    } finally {
      setReportBusy(false)
    }
  }

  const callSupportChain = async () => {
    if (!active?.user?.user_id) return
    try {
      const result = await callContact({ user_id: active.user.user_id })
      if (result.mode === 'fallback') window.location.href = `tel:${result.target}`
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not start the call')
    }
  }

  return (
    <AppShell title="Family Hub" subtitle="Create parents, add caretakers, and manage reminders in one place.">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Manager account</p>
            <p className="mt-1 text-sm text-ink/60">{workspace?.account?.email || session.email || 'Signed in'}</p>
          </div>
          <PressableButton variant="soft" size="md" onClick={() => void load()}>
            Refresh
          </PressableButton>
        </div>
        <p className="mt-3 text-sm text-ink/65">
          {workspace?.account?.name || session.display_name}
          {workspace?.account?.phone ? ` | ${workspace.account.phone}` : ''}
        </p>
        {message ? <p className="mt-3 text-sm font-semibold text-ink/70">{message}</p> : null}
        {parentLoginNotice ? <p className="mt-2 text-sm font-semibold text-mint-900">{parentLoginNotice}</p> : null}
        {error ? <p className="mt-2 text-sm font-semibold text-danger">{error}</p> : null}
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Parents you manage</p>
        <p className="mt-1 text-sm text-ink/60">Select a registered parent first, then manage their medicines, reports, caretakers, and reminders below.</p>
        <div className="mt-3 grid gap-2">
          {(workspace?.managed_users || []).map((user) => {
            const selected = user.user_id === activeUserId
            return (
              <button
                key={user.user_id}
                type="button"
                onClick={() => void load(user.user_id)}
                className={[
                  'rounded-2xl p-3 text-left shadow-soft ring-1 ring-black/5 transition-colors',
                  selected ? 'bg-mint/20' : 'bg-white/70 hover:bg-white/90',
                ].join(' ')}
              >
                <p className="text-sm font-extrabold text-ink">{user.name}</p>
                <p className="mt-1 text-sm text-ink/60">{user.user_id} | {user.language} | {user.city || user.region || 'Location not set'}</p>
              </button>
            )
          })}
          {!loading && (workspace?.managed_users?.length || 0) === 0 ? (
            <p className="text-sm text-ink/60">No parent profile yet. Add the first one below.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <p className="text-lg font-extrabold tracking-tight text-ink">Add a parent profile</p>
        <p className="mt-1 text-sm text-ink/60">You create each parent login here. Give them a unique user ID and password they can use on their own device.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ['Parent name', 'name'],
            ['Parent user ID', 'user_id'],
            ['Parent password', 'password'],
            ['Optional email', 'email'],
            ['Age', 'age'],
            ['Region', 'region'],
            ['City', 'city'],
            ['Origin', 'origin'],
            ['Phone', 'phone'],
          ].map(([label, key]) => (
            <label key={key} className="block text-sm font-semibold text-ink/70">
              <span>{label}</span>
              <input
                type={key === 'password' ? 'password' : 'text'}
                value={parentForm[key as keyof ParentForm]}
                onChange={(e) =>
                  setParentForm((current) => ({
                    ...current,
                    [key]: key === 'user_id' ? normalizeParentUserId(e.target.value) : e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
              />
            </label>
          ))}
          <label className="block text-sm font-semibold text-ink/70">
            <span>Regional language</span>
            <select
              value={parentForm.language}
              onChange={(e) => setParentForm((current) => ({ ...current, language: e.target.value }))}
              className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
            >
              {regionalLanguages.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-ink/70">
            <span>Wake time</span>
            <input
              value={parentForm.wake_time}
              onChange={(e) => setParentForm((current) => ({ ...current, wake_time: e.target.value }))}
              className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
            />
          </label>
          <label className="block text-sm font-semibold text-ink/70">
            <span>Sleep time</span>
            <input
              value={parentForm.sleep_time}
              onChange={(e) => setParentForm((current) => ({ ...current, sleep_time: e.target.value }))}
              className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
            />
          </label>
        </div>
        <div className="mt-3">
          <PressableButton variant="primary" size="lg" onClick={() => void addParent()} disabled={savingParent}>
            {savingParent ? 'Adding...' : 'Add parent'}
          </PressableButton>
        </div>
      </Card>

      {active?.user ? (
        <>
          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Active parent</p>
            <div className="mt-3 rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
              <p className="text-base font-extrabold text-ink">{active.user.name}</p>
              <p className="mt-1 text-sm text-ink/60">{active.user.user_id} | {active.user.age} years | {active.user.language} | {active.user.city || active.user.region || 'Location pending'}</p>
              <p className="mt-1 text-sm text-ink/60">Wake {active.user.wake_time} | Sleep {active.user.sleep_time}</p>
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Food and preference notes</p>
            <p className="mt-1 text-sm text-ink/60">Saving for {active.user.name}.</p>
            <p className="mt-1 text-sm text-ink/60">Comma separated: meals, likes, dislikes, prayer habits, comfort items.</p>
            <textarea
              rows={4}
              value={preferencesText}
              onChange={(e) => setPreferencesText(e.target.value)}
              className="mt-3 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
            />
            <div className="mt-3">
              <PressableButton variant="primary" size="lg" onClick={() => void saveCarePlan()} disabled={savingCarePlan}>
                {savingCarePlan ? 'Saving...' : 'Save care plan'}
              </PressableButton>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-extrabold tracking-tight text-ink">Medicine plan</p>
                <p className="mt-1 text-sm text-ink/60">Saving for {active.user.name}.</p>
                <p className="mt-1 text-sm text-ink/60">Bhumi reads these reminders and the parent can confirm from the app.</p>
              </div>
              <PressableButton variant="soft" size="md" onClick={() => setMedicines((current) => [...current, blankMedicine()])}>
                Add row
              </PressableButton>
            </div>
            <div className="mt-3 space-y-3">
              {medicines.map((item, index) => (
                <div key={item.id || index} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ['Name', 'name'],
                      ['Dose', 'dose'],
                      ['Instructions', 'instructions'],
                      ['Condition', 'condition'],
                    ].map(([label, key]) => (
                      <label key={key} className="block text-sm font-semibold text-ink/70">
                        <span>{label}</span>
                        <input
                          value={String(item[key as keyof MedicineItem] || '')}
                          onChange={(e) =>
                            setMedicines((current) =>
                              current.map((med, medIndex) => (medIndex === index ? { ...med, [key]: e.target.value } : med)),
                            )
                          }
                          className="mt-1 w-full rounded-xl2 border-0 bg-white/80 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
                        />
                      </label>
                    ))}
                    <label className="block text-sm font-semibold text-ink/70">
                      <span>Times</span>
                      <input
                        value={(item.times || []).join(', ')}
                        onChange={(e) =>
                          setMedicines((current) =>
                            current.map((med, medIndex) =>
                              medIndex === index
                                ? { ...med, times: e.target.value.split(',').map((time) => time.trim()).filter(Boolean) }
                                : med,
                            ),
                          )
                        }
                        placeholder="08:00, 20:00"
                        className="mt-1 w-full rounded-xl2 border-0 bg-white/80 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
                      />
                    </label>
                  </div>
                  <div className="mt-3">
                    <PressableButton
                      variant="soft"
                      size="md"
                      onClick={() => setMedicines((current) => current.filter((_, medIndex) => medIndex !== index))}
                    >
                      Remove
                    </PressableButton>
                  </div>
                </div>
              ))}
              {!medicines.length ? <p className="text-sm text-ink/60">No medicines added yet.</p> : null}
            </div>
            <div className="mt-3">
              <PressableButton variant="primary" size="lg" onClick={() => void saveMedicinePlan()} disabled={savingMedicine}>
                {savingMedicine ? 'Saving...' : 'Save medicines'}
              </PressableButton>
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Add caretaker login</p>
            <p className="mt-1 text-sm text-ink/60">This caretaker will be linked to {active.user.name}.</p>
            <p className="mt-1 text-sm text-ink/60">Create extra logins for the selected parent only.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ['Name', 'name'],
                ['Email', 'email'],
                ['Password', 'password'],
                ['Phone', 'phone'],
                ['Relation', 'relation'],
              ].map(([label, key]) => (
                <label key={key} className="block text-sm font-semibold text-ink/70">
                  <span>{label}</span>
                  <input
                    type={key === 'password' ? 'password' : 'text'}
                    value={caretakerForm[key as keyof CaretakerForm]}
                    onChange={(e) => setCaretakerForm((current) => ({ ...current, [key]: e.target.value }))}
                    className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3">
              <PressableButton variant="primary" size="lg" onClick={() => void addCaretaker()} disabled={savingCaretaker}>
                {savingCaretaker ? 'Creating...' : 'Create caretaker login'}
              </PressableButton>
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Reminders and urgent contact</p>
            <p className="mt-1 text-sm text-ink/60">These reminders and urgent actions will go to {active.user.name} and their linked support chain.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,160px,auto]">
              <input
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
                placeholder="Reminder label"
              />
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
              />
              <PressableButton variant="primary" size="lg" onClick={() => void addReminder()}>
                Add reminder
              </PressableButton>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <PressableButton variant="soft" size="lg" onClick={() => void callSupportChain()}>
                Call support chain
              </PressableButton>
              <PressableButton variant="soft" size="lg" onClick={() => void runWhatsAppTest()} disabled={whatsAppBusy}>
                {whatsAppBusy ? 'Testing...' : 'Test WhatsApp'}
              </PressableButton>
            </div>
            <div className="mt-3 space-y-2">
              {upcomingAlarms.map((alarm: AlarmItem) => (
                <div key={alarm.id} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                  <p className="text-sm font-extrabold text-ink">{alarm.title}</p>
                  <p className="mt-1 text-sm text-ink/60">{new Date(alarm.time_iso).toLocaleString()}</p>
                </div>
              ))}
              {!upcomingAlarms.length ? <p className="text-sm text-ink/60">No upcoming reminders yet.</p> : null}
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Scan medical report</p>
            <p className="mt-1 text-sm text-ink/60">Importing for {active.user.name}.</p>
            <p className="mt-1 text-sm text-ink/60">
              Add a photo from the camera or gallery. Bhumi extracts the report text, stores the image, and prepares a simple summary.
            </p>
            <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-white/70 px-4 py-6 text-sm font-semibold text-ink/70 shadow-soft">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadReport(file)
                  e.currentTarget.value = ''
                }}
              />
              {reportBusy ? 'Scanning report...' : 'Choose or capture report image'}
            </label>
            <div className="mt-3 space-y-3">
              {(active.reports || []).map((report) => (
                <div key={report.id} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-ink">{report.file_name}</p>
                      <p className="mt-1 text-xs font-semibold tracking-wide text-ink/55">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <PressableButton
                      variant="soft"
                      size="md"
                      onClick={() => active.user.user_id && void deleteReport(active.user.user_id, report.id).then(() => load(active.user.user_id))}
                    >
                      Delete
                    </PressableButton>
                  </div>
                  {report.image_data_url ? (
                    <img src={report.image_data_url} alt={report.file_name} className="mt-3 h-40 w-full rounded-2xl object-cover ring-1 ring-black/5" />
                  ) : null}
                  <p className="mt-3 text-sm font-extrabold text-ink">Summary</p>
                  <p className="mt-1 text-sm text-ink/70">{report.summary || 'No summary yet.'}</p>
                  <p className="mt-3 text-sm font-extrabold text-ink">Advice</p>
                  <p className="mt-1 text-sm text-ink/70">{report.advice || 'No advice yet.'}</p>
                </div>
              ))}
              {!active.reports.length ? <p className="text-sm text-ink/60">No saved reports yet.</p> : null}
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Live support circle</p>
            <div className="mt-3 space-y-2">
              {(active.support_contacts || []).map((item, index) => (
                <div key={`${item.phone}-${index}`} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                  <p className="text-sm font-extrabold text-ink">{item.name}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {item.role} {item.phone ? `• ${item.phone}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Recent alerts</p>
            <div className="mt-3 space-y-2">
              {(active.alerts || []).slice().reverse().slice(0, 6).map((item, index) => (
                <div key={`${item.time_created}-${index}`} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                  <p className="text-sm font-extrabold text-ink">
                    {item.type} • severity {item.severity}
                  </p>
                  <p className="mt-1 text-sm text-ink/60">{item.message}</p>
                </div>
              ))}
              {!active.alerts.length ? <p className="text-sm text-ink/60">No alerts yet.</p> : null}
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Recent conversation</p>
            <div className="mt-3 space-y-2">
              {(active.recent_conversations || []).slice().reverse().slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                  <p className="text-sm text-ink/70">
                    <span className="font-bold text-ink">User:</span> {item.text_input}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    <span className="font-extrabold">Bhumi:</span> {item.ai_response}
                  </p>
                </div>
              ))}
              {!active.recent_conversations.length ? <p className="text-sm text-ink/60">No recent chats yet.</p> : null}
            </div>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
