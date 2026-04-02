export type SpeechSupport = {
  stt: boolean
  tts: boolean
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionResultEventLike = {
  results?: ArrayLike<ArrayLike<{ transcript?: string }>>
}

export function getSpeechSupport(): SpeechSupport {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  const stt = typeof window !== 'undefined' && Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
  const tts = typeof window !== 'undefined' && 'speechSynthesis' in window
  return { stt, tts }
}

export function speak(text: string, { lang = 'en-IN', rate = 0.92, pitch = 1.02 }: { lang?: string; rate?: number; pitch?: number } = {}) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = rate
  u.pitch = pitch
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
}

let _currentAudio: HTMLAudioElement | null = null

export function stopAudioPlayback() {
  if (_currentAudio) {
    _currentAudio.pause()
    _currentAudio.currentTime = 0
    _currentAudio = null
  }
}

export async function playAudioUrl(url: string): Promise<void> {
  stopAudioPlayback()
  const a = new Audio(url)
  _currentAudio = a
  a.preload = 'auto'
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      a.removeEventListener('canplaythrough', onReady)
      a.removeEventListener('error', onError)
      clearTimeout(timer)
    }
    const done = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }
    const fail = (message: string) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(message))
    }
    const onReady = () => done()
    const onError = () => fail('Audio could not be loaded')
    const timer = setTimeout(() => fail('Audio load timed out'), 8000)
    a.addEventListener('canplaythrough', onReady, { once: true })
    a.addEventListener('error', onError, { once: true })
    a.load()
  })
  await new Promise<void>((resolve) => {
    a.onended = () => { _currentAudio = null; resolve() }
    a.onpause = () => { resolve() }
    a.play().catch(() => { _currentAudio = null; resolve() })
  })
}

export function listenOnce({
  lang = 'en-IN',
  timeoutMs = 15000,
  silenceMs = 7000,
}: {
  lang?: string
  timeoutMs?: number
  silenceMs?: number
}): Promise<{ transcript: string }> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return reject(new Error('SpeechRecognition not supported in this browser'))

    const rec = new SR()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    let settled = false
    let transcript = ''
    let silenceTimer = -1

    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(hardStop)
      window.clearTimeout(silenceTimer)
      try { rec.stop() } catch { /* ignore */ }
      fn()
    }

    // --- Hard stop: 15s max no matter what ---
    const hardStop = window.setTimeout(() => {
      done(() => {
        if (transcript.trim()) resolve({ transcript: transcript.trim() })
        else reject(new Error('Listening timed out'))
      })
    }, timeoutMs)

    // --- Start silence timer (resets on every speech result) ---
    const startSilenceTimer = () => {
      window.clearTimeout(silenceTimer)
      silenceTimer = window.setTimeout(() => {
        done(() => {
          if (transcript.trim()) resolve({ transcript: transcript.trim() })
          else reject(new Error('No speech detected'))
        })
      }, silenceMs)
    }

    // Start the initial silence timer immediately
    startSilenceTimer()

    rec.onresult = (event: unknown) => {
      const ev = event as SpeechRecognitionResultEventLike
      const results = ev?.results
      if (!results?.length) return
      // Collect all results into one transcript
      let full = ''
      for (let i = 0; i < results.length; i++) {
        const alt = results[i]?.[0]
        if (alt?.transcript) full += alt.transcript
      }
      if (full) transcript = full
      // User is speaking — reset silence timer
      startSilenceTimer()
    }

    rec.onerror = (e: unknown) => {
      const msg = (e as { error?: string } | undefined)?.error || 'Speech recognition error'
      if (msg === 'no-speech' || msg === 'aborted') return
      done(() => reject(new Error(msg)))
    }

    rec.onend = () => {
      // continuous mode ended unexpectedly — restart if we're still listening
      if (settled) return
      try { rec.start() } catch { /* give up */ }
    }

    try {
      rec.start()
    } catch (e: unknown) {
      window.clearTimeout(hardStop)
      window.clearTimeout(silenceTimer)
      reject(e)
    }
  })
}
