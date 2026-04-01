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
  deleteCaretakerLogin,
  deleteReport,
  getSupportWorkspace,
  postVoice,
  resetParentPassword,
  reviewReportMedicines,
  saveMedicines,
  sendSos,
  syncMedicineReminders,
  testWhatsApp,
  updateCaretakerLogin,
  updateSupportAccount,
  updateUserProfile,
  type AlarmItem,
  type AppSession,
  type MedicineItem,
  type SupportWorkspace,
} from '../lib/api'
import { runAssistantPlugin } from '../lib/assistantPlugins'
import { regionalLanguages } from '../lib/regionalLanguages'
import { getStoredSession } from '../lib/session'
import { BellSticker, ElderSticker, FamilySticker, HeartPulseSticker, PillSticker, SparkleSticker } from '../ui/stickers'
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

type ReportReviewState = {
  reportId: string
  reportName: string
  medicines: MedicineItem[]
}

type ManagerForm = {
  name: string
  email: string
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

function emptyManagerForm(): ManagerForm {
  return {
    name: '',
    email: '',
    phone: '',
    relation: 'Son / Daughter',
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
  const [managerForm, setManagerForm] = useState<ManagerForm>(() => emptyManagerForm())
  const [reminderTitle, setReminderTitle] = useState('Medicine reminder')
  const [reminderTime, setReminderTime] = useState('')
  const [commandText, setCommandText] = useState('')
  const [preferencesText, setPreferencesText] = useState('')
  const [medicines, setMedicines] = useState<MedicineItem[]>([])
  const [supportDrafts, setSupportDrafts] = useState<Record<string, { name: string; relation: string; phone: string; email: string; password: string }>>({})
  const [pendingReportReview, setPendingReportReview] = useState<ReportReviewState | null>(null)
  const [parentPasswordDraft, setParentPasswordDraft] = useState('')
  const [savingCarePlan, setSavingCarePlan] = useState(false)
  const [savingMedicine, setSavingMedicine] = useState(false)
  const [savingParent, setSavingParent] = useState(false)
  const [savingCaretaker, setSavingCaretaker] = useState(false)
  const [savingManager, setSavingManager] = useState(false)
  const [commandBusy, setCommandBusy] = useState(false)
  const [parentPasswordBusy, setParentPasswordBusy] = useState(false)
  const [supportActionBusy, setSupportActionBusy] = useState('')
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
    setSupportDrafts(
      Object.fromEntries(
        (active.support_contacts || []).map((item, index) => [
          item.id || `${item.name}-${index}`,
          {
            name: item.name || '',
            relation: item.relation || item.role || '',
            phone: item.phone || '',
            email: item.email || '',
            password: '',
          },
        ]),
      ),
    )
    setParentPasswordDraft('')
  }, [active?.user?.user_id, active?.medicines])

  useEffect(() => {
    if (!workspace?.account) return
    setManagerForm({
      name: workspace.account.name || '',
      email: workspace.account.email || '',
      phone: workspace.account.phone || '',
      relation: workspace.account.relation || 'Son / Daughter',
    })
  }, [workspace?.account?.account_id, workspace?.account?.name, workspace?.account?.email, workspace?.account?.phone, workspace?.account?.relation])

  const upcomingAlarms = useMemo(
    () => (active?.alarms || []).filter((item) => new Date(item.time_iso).getTime() >= Date.now()),
    [active?.alarms],
  )
  const adherenceStats = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    const todayLogs = (active?.medicine_logs || []).filter((item) =>
      String(item.confirmed_time || item.created_at || '').startsWith(todayKey),
    )
    const takenToday = todayLogs.filter((item) => item.status === 'taken').length
    const missedToday = todayLogs.filter((item) => item.status === 'missed').length
    const latestTaken = [...todayLogs].reverse().find((item) => item.status === 'taken')
    return {
      takenToday,
      missedToday,
      lastTakenLabel: latestTaken?.medicine_name
        ? `${latestTaken.medicine_name} at ${new Date(latestTaken.confirmed_time || latestTaken.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : 'No dose confirmed today',
    }
  }, [active?.medicine_logs])
  const overviewStats = useMemo(
    () => [
      { label: 'Medicines', value: String(active?.medicines?.length || 0) },
      { label: 'Reminders', value: String(upcomingAlarms.length) },
      { label: 'Caretakers', value: String(active?.support_contacts?.length || 0) },
      { label: 'Reports', value: String(active?.reports?.length || 0) },
    ],
    [active?.medicines?.length, active?.reports?.length, active?.support_contacts?.length, upcomingAlarms.length],
  )
  const recentAudit = useMemo(() => (active?.audit || []).slice(0, 6), [active?.audit])

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

  const saveManagerProfile = async () => {
    if (!accountId) return
    try {
      setSavingManager(true)
      setError('')
      setMessage('')
      await updateSupportAccount(accountId, {
        name: managerForm.name.trim(),
        email: managerForm.email.trim(),
        phone: managerForm.phone.trim(),
        relation: managerForm.relation.trim(),
      })
      setMessage('Family manager profile saved.')
      await load(activeUserId)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not save family manager profile')
    } finally {
      setSavingManager(false)
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
      const savedReport = await addReport(active.user.user_id, {
        file_name: file.name,
        mime_type: file.type || 'image/jpeg',
        image_data_url: imageDataUrl,
        ocr_text: ocrText,
        summary: analysis.summary,
        advice: analysis.advice,
      })
      if ((analysis.suggested_medicines || []).length) {
        setPendingReportReview({
          reportId: savedReport.id,
          reportName: file.name,
          medicines: analysis.suggested_medicines.map((item) => ({
            id: item.id || crypto.randomUUID(),
            name: item.name || '',
            dose: item.dose || '',
            times: item.times?.length ? item.times : ['08:00'],
            instructions: item.instructions || '',
            condition: item.condition || '',
          })),
        })
      } else {
        setPendingReportReview(null)
      }
      setMessage(
        (analysis.suggested_medicines || []).length
          ? 'Report scanned. Review the imported medicines below before they go live.'
          : 'Report scanned and saved.',
      )
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not scan the report')
    } finally {
      setReportBusy(false)
    }
  }

  const approveReportImport = async () => {
    if (!active?.user?.user_id || !pendingReportReview) return
    try {
      setReportBusy(true)
      setError('')
      const approved = pendingReportReview.medicines.filter((item) => item.name.trim())
      await reviewReportMedicines(active.user.user_id, pendingReportReview.reportId, {
        decision: 'approve',
        medicines: approved,
        actor_name: workspace?.account?.name || session?.display_name,
        actor_role: 'family_manager',
      })
      await syncMedicineReminders(active.user.user_id)
      setPendingReportReview(null)
      setMessage('Imported medicines were approved and reminder times were synced.')
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not approve imported medicines')
    } finally {
      setReportBusy(false)
    }
  }

  const rejectReportImport = async () => {
    if (!active?.user?.user_id || !pendingReportReview) return
    try {
      setReportBusy(true)
      setError('')
      await reviewReportMedicines(active.user.user_id, pendingReportReview.reportId, {
        decision: 'reject',
        actor_name: workspace?.account?.name || session?.display_name,
        actor_role: 'family_manager',
      })
      setPendingReportReview(null)
      setMessage('Imported medicines were rejected and not added to the live plan.')
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not reject imported medicines')
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

  const runManagerCommand = async () => {
    if (!active?.user?.user_id || !commandText.trim()) return
    try {
      setCommandBusy(true)
      setError('')
      setMessage('')
      const rawText = commandText.trim()
      const plugin = runAssistantPlugin(rawText)

      if (plugin.type === 'alarm') {
        await createAlarm(active.user.user_id, {
          title: plugin.payload.title || 'Reminder',
          time_iso: plugin.payload.timeIso,
          label: plugin.payload.label || rawText,
          source: 'family_manager_command',
        })
        setMessage(`Reminder created for ${active.user.name}.`)
        setCommandText('')
        await load(active.user.user_id)
        return
      }

      if (plugin.type === 'list_alarms') {
        setMessage(
          upcomingAlarms.length
            ? upcomingAlarms
                .slice(0, 3)
                .map((alarm) => `${alarm.title} at ${new Date(alarm.time_iso).toLocaleString()}`)
                .join(' | ')
            : `No upcoming reminders for ${active.user.name}.`,
        )
        return
      }

      if (plugin.type === 'call') {
        await callSupportChain()
        setMessage(`Calling the support chain for ${active.user.name}.`)
        return
      }

      if (plugin.type === 'sos') {
        await sendSos({ user_id: active.user.user_id, reason: plugin.reason || rawText, severity: 90 })
        await callSupportChain()
        setMessage(`Urgent SOS sent for ${active.user.name}. Call flow started too.`)
        setCommandText('')
        return
      }

      const ai = await postVoice({ user_id: active.user.user_id, text: rawText })
      setMessage(ai.text)
      setCommandText('')
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not run that manager command')
    } finally {
      setCommandBusy(false)
    }
  }

  const submitParentPasswordReset = async () => {
    if (!accountId || !active?.user?.user_id || !parentPasswordDraft.trim()) return
    try {
      setParentPasswordBusy(true)
      setError('')
      await resetParentPassword(accountId, active.user.user_id, { password: parentPasswordDraft.trim() })
      setMessage(`Parent password updated for ${active.user.name}.`)
      setParentPasswordDraft('')
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not reset parent password')
    } finally {
      setParentPasswordBusy(false)
    }
  }

  const saveSupportMember = async (contactId: string) => {
    if (!accountId || !active?.user?.user_id) return
    const draft = supportDrafts[contactId]
    if (!draft) return
    try {
      setSupportActionBusy(`save:${contactId}`)
      setError('')
      await updateCaretakerLogin(accountId, contactId, {
        user_id: active.user.user_id,
        name: draft.name,
        relation: draft.relation,
        role: 'support',
        phone: draft.phone,
        email: draft.email,
        password: draft.password || undefined,
      })
      setMessage(`Support member ${draft.name || 'contact'} updated.`)
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not update support member')
    } finally {
      setSupportActionBusy('')
    }
  }

  const removeSupportMember = async (contactId: string) => {
    if (!accountId || !active?.user?.user_id) return
    try {
      setSupportActionBusy(`delete:${contactId}`)
      setError('')
      await deleteCaretakerLogin(accountId, contactId, active.user.user_id)
      setMessage('Support member removed.')
      await load(active.user.user_id)
    } catch (e: unknown) {
      setError((e as { message?: string } | undefined)?.message || 'Could not remove support member')
    } finally {
      setSupportActionBusy('')
    }
  }

  return (
    <AppShell title="Family Hub" subtitle="Manage parents, medicines, reminders, caretakers, and reports from one clean dashboard.">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky/15 p-2 ring-1 ring-black/5">
              <FamilySticker className="h-12 w-12" tone="sky" />
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-ink">Manager account</p>
              <p className="mt-1 text-sm text-ink/60">{workspace?.account?.email || session.email || 'Signed in'}</p>
            </div>
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
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-mint/15 p-2 ring-1 ring-black/5">
            <SparkleSticker className="h-10 w-10" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Family manager profile</p>
            <p className="mt-1 text-sm text-ink/60">This is your own profile. It is separate from the parent profiles you create below.</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ['Your name', 'name'],
            ['Email', 'email'],
            ['Phone', 'phone'],
            ['Relation', 'relation'],
          ].map(([label, key]) => (
            <label key={key} className="block text-sm font-semibold text-ink/70">
              <span>{label}</span>
              <input
                value={managerForm[key as keyof ManagerForm]}
                onChange={(e) => setManagerForm((current) => ({ ...current, [key]: e.target.value }))}
                className="mt-1 w-full rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
              />
            </label>
          ))}
        </div>
        <div className="mt-3">
          <PressableButton variant="primary" size="lg" onClick={() => void saveManagerProfile()} disabled={savingManager}>
            {savingManager ? 'Saving...' : 'Save family manager profile'}
          </PressableButton>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-peach/20 p-2 ring-1 ring-black/5">
            <ElderSticker className="h-11 w-11" tone="peach" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">Parents you manage</p>
            <p className="mt-1 text-sm text-ink/60">Select a registered parent first, then manage their medicines, reports, caretakers, and reminders below.</p>
          </div>
        </div>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-ink/45">Selected parent</p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{active.user.name}</p>
                <p className="mt-2 text-sm text-ink/60">{active.user.user_id} | {active.user.age} years | {active.user.language} | {active.user.city || active.user.region || 'Location pending'}</p>
                <p className="mt-1 text-sm text-ink/60">Wake {active.user.wake_time} | Sleep {active.user.sleep_time}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {overviewStats.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-soft ring-1 ring-black/5">
                    <p className="text-xl font-extrabold text-ink">{item.value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Quick management command</p>
            <p className="mt-1 text-sm text-ink/60">Type things like "set alarm for 8 pm", "call support", "send SOS", or "play Ramayana for mom".</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,auto]">
              <input
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                placeholder="Type one manager command"
                className="rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void runManagerCommand()
                  }
                }}
              />
              <PressableButton variant="primary" size="lg" onClick={() => void runManagerCommand()} disabled={commandBusy}>
                {commandBusy ? 'Running...' : 'Run command'}
              </PressableButton>
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Medicine adherence snapshot</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/75 p-3 shadow-soft ring-1 ring-black/5">
                <p className="text-sm font-semibold text-ink/60">Taken today</p>
                <p className="mt-2 text-2xl font-extrabold text-ink">{adherenceStats.takenToday}</p>
              </div>
              <div className="rounded-2xl bg-white/75 p-3 shadow-soft ring-1 ring-black/5">
                <p className="text-sm font-semibold text-ink/60">Missed today</p>
                <p className="mt-2 text-2xl font-extrabold text-ink">{adherenceStats.missedToday}</p>
              </div>
              <div className="rounded-2xl bg-white/75 p-3 shadow-soft ring-1 ring-black/5">
                <p className="text-sm font-semibold text-ink/60">Last confirmed dose</p>
                <p className="mt-2 text-sm font-extrabold text-ink">{adherenceStats.lastTakenLabel}</p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Parent login recovery</p>
            <p className="mt-1 text-sm text-ink/60">Reset the selected parent's password if they forget it.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,auto]">
              <input
                type="password"
                value={parentPasswordDraft}
                onChange={(e) => setParentPasswordDraft(e.target.value)}
                placeholder={`New password for ${active.user.user_id}`}
                className="rounded-xl2 border-0 bg-white/75 px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
              />
              <PressableButton variant="primary" size="lg" onClick={() => void submitParentPasswordReset()} disabled={parentPasswordBusy}>
                {parentPasswordBusy ? 'Updating...' : 'Reset password'}
              </PressableButton>
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
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky/15 p-2 ring-1 ring-black/5">
                  <PillSticker className="h-11 w-11" />
                </div>
                <div>
                  <p className="text-lg font-extrabold tracking-tight text-ink">Medicine plan</p>
                  <p className="mt-1 text-sm text-ink/60">Saving for {active.user.name}.</p>
                  <p className="mt-1 text-sm text-ink/60">Bhumi reads these reminders and the parent can confirm from the app.</p>
                </div>
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

          {pendingReportReview ? (
            <Card>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-peach/20 p-2 ring-1 ring-black/5">
                  <PillSticker className="h-10 w-10" />
                </div>
                <div>
                  <p className="text-lg font-extrabold tracking-tight text-ink">Imported medicines review</p>
                  <p className="mt-1 text-sm text-ink/60">Review suggestions from {pendingReportReview.reportName} before they are added to the live medicine plan.</p>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {pendingReportReview.medicines.map((item, index) => (
                  <div key={item.id || index} className="rounded-2xl bg-white/75 p-3 shadow-soft ring-1 ring-black/5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold text-ink">{item.name || `Imported medicine ${index + 1}`}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                        {item.times?.length ? 'timed suggestion' : 'needs timing review'}
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
                              setPendingReportReview((current) =>
                                current
                                  ? {
                                      ...current,
                                      medicines: current.medicines.map((med, medIndex) =>
                                        medIndex === index ? { ...med, [key]: e.target.value } : med,
                                      ),
                                    }
                                  : current,
                              )
                            }
                            className="mt-1 w-full rounded-xl2 border-0 bg-white px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
                          />
                        </label>
                      ))}
                      <label className="block text-sm font-semibold text-ink/70">
                        <span>Times</span>
                        <input
                          value={(item.times || []).join(', ')}
                          onChange={(e) =>
                            setPendingReportReview((current) =>
                              current
                                ? {
                                    ...current,
                                    medicines: current.medicines.map((med, medIndex) =>
                                      medIndex === index
                                        ? { ...med, times: e.target.value.split(',').map((time) => time.trim()).filter(Boolean) }
                                        : med,
                                    ),
                                  }
                                : current,
                            )
                          }
                          placeholder="08:00, 20:00"
                          className="mt-1 w-full rounded-xl2 border-0 bg-white px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
                        />
                      </label>
                    </div>
                    <div className="mt-3">
                      <PressableButton
                        variant="soft"
                        size="md"
                        onClick={() =>
                          setPendingReportReview((current) =>
                            current
                              ? { ...current, medicines: current.medicines.filter((_, medIndex) => medIndex !== index) }
                              : current,
                          )
                        }
                      >
                        Reject this medicine
                      </PressableButton>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PressableButton variant="soft" size="lg" onClick={() => void rejectReportImport()} disabled={reportBusy}>
                  {reportBusy ? 'Working...' : 'Reject import'}
                </PressableButton>
                <PressableButton variant="primary" size="lg" onClick={() => void approveReportImport()} disabled={reportBusy}>
                  {reportBusy ? 'Working...' : 'Approve and sync'}
                </PressableButton>
              </div>
            </Card>
          ) : null}

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
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-peach/20 p-2 ring-1 ring-black/5">
                <BellSticker className="h-10 w-10" />
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight text-ink">Reminders and urgent contact</p>
                <p className="mt-1 text-sm text-ink/60">These reminders and urgent actions will go to {active.user.name} and their linked support chain.</p>
              </div>
            </div>
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
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky/15 p-2 ring-1 ring-black/5">
                <HeartPulseSticker className="h-10 w-10" />
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight text-ink">Scan medical report</p>
                <p className="mt-1 text-sm text-ink/60">Importing for {active.user.name}.</p>
                <p className="mt-1 text-sm text-ink/60">
                  Add a photo from the camera or gallery. Bhumi extracts the report text, stores the image, and prepares a simple summary.
                </p>
              </div>
            </div>
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
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-mint/15 p-2 ring-1 ring-black/5">
                <FamilySticker className="h-10 w-10" tone="mint" />
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight text-ink">Live support circle</p>
                <p className="mt-1 text-sm text-ink/60">Edit linked support people, change their phone/email, or remove them from this parent.</p>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {(active.support_contacts || []).map((item, index) => (
                <div key={`${item.id || item.phone}-${index}`} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                  <p className="text-sm font-extrabold text-ink">{item.name}</p>
                  <p className="mt-1 text-sm text-ink/60">{item.role}{item.phone ? ` | ${item.phone}` : ''}</p>
                  {item.id !== 'primary-support' ? (
                    <>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {[
                          ['Name', 'name'],
                          ['Relation', 'relation'],
                          ['Phone', 'phone'],
                          ['Email', 'email'],
                          ['New password', 'password'],
                        ].map(([label, key]) => (
                          <label key={key} className="block text-sm font-semibold text-ink/70">
                            <span>{label}</span>
                            <input
                              type={key === 'password' ? 'password' : 'text'}
                              value={supportDrafts[item.id || `${item.name}-${index}`]?.[key as 'name' | 'relation' | 'phone' | 'email' | 'password'] || ''}
                              onChange={(e) =>
                                setSupportDrafts((current) => ({
                                  ...current,
                                  [item.id || `${item.name}-${index}`]: {
                                    ...(current[item.id || `${item.name}-${index}`] || {
                                      name: item.name || '',
                                      relation: item.relation || item.role || '',
                                      phone: item.phone || '',
                                      email: item.email || '',
                                      password: '',
                                    }),
                                    [key]: e.target.value,
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-xl2 border-0 bg-white px-3 py-3 text-base shadow-soft ring-1 ring-black/5"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <PressableButton
                          variant="soft"
                          size="md"
                          onClick={() => void removeSupportMember(item.id || `${item.name}-${index}`)}
                          disabled={supportActionBusy === `delete:${item.id || `${item.name}-${index}`}`}
                        >
                          {supportActionBusy === `delete:${item.id || `${item.name}-${index}`}` ? 'Removing...' : 'Remove'}
                        </PressableButton>
                        <PressableButton
                          variant="primary"
                          size="md"
                          onClick={() => void saveSupportMember(item.id || `${item.name}-${index}`)}
                          disabled={supportActionBusy === `save:${item.id || `${item.name}-${index}`}`}
                        >
                          {supportActionBusy === `save:${item.id || `${item.name}-${index}`}` ? 'Saving...' : 'Save changes'}
                        </PressableButton>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-lg font-extrabold tracking-tight text-ink">Recent alerts</p>
            <div className="mt-3 space-y-2">
              {(active.alerts || []).slice().reverse().slice(0, 6).map((item, index) => (
                <div key={`${item.time_created}-${index}`} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                  <p className="text-sm font-extrabold text-ink">{item.type} | severity {item.severity}</p>
                  <p className="mt-1 text-sm text-ink/60">{item.message}</p>
                </div>
              ))}
              {!active.alerts.length ? <p className="text-sm text-ink/60">No alerts yet.</p> : null}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-peach/20 p-2 ring-1 ring-black/5">
                <SparkleSticker className="h-10 w-10" />
              </div>
              <p className="text-lg font-extrabold tracking-tight text-ink">Family activity</p>
            </div>
            <div className="mt-3 space-y-2">
              {recentAudit.map((item) => (
                <div key={item.id} className="rounded-2xl bg-white/70 p-3 shadow-soft ring-1 ring-black/5">
                  <p className="text-sm font-extrabold text-ink">{item.summary}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {item.actor_name || 'Family Hub'}
                    {item.actor_role ? ` | ${item.actor_role}` : ''}
                    {item.created_at ? ` | ${new Date(item.created_at).toLocaleString()}` : ''}
                  </p>
                </div>
              ))}
              {!recentAudit.length ? <p className="text-sm text-ink/60">No management updates yet.</p> : null}
            </div>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
