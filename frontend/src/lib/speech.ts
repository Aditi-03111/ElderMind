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
  timeoutMs = 9000,
  pauseMs = 5000,
}: {
  lang?: string
  timeoutMs?: number
  pauseMs?: number
}): Promise<{ transcript: string }> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return reject(new Error('SpeechRecognition not supported in this browser'))

    const rec = new SR()
    rec.lang = lang
    rec.interimResults = true
    rec.maxAlternatives = 1

    let done = false
    let transcript = ''
    let startedAt = 0
    let retried = false
    const finish = (fn: () => void) => {
      if (done) return
      done = true
      try {
        rec.stop()
      } catch {
        // ignore
      }
      fn()
    }

    const totalTimer = window.setTimeout(() => {
      finish(() => reject(new Error('Listening timed out')))
    }, timeoutMs)

    let pauseTimer = window.setTimeout(() => {
      finish(() =>
        transcript.trim()
          ? resolve({ transcript: transcript.trim() })
          : reject(new Error('Listening timed out')),
      )
    }, pauseMs)

    const resetPauseTimer = () => {
      window.clearTimeout(pauseTimer)
      pauseTimer = window.setTimeout(() => {
        finish(() =>
          transcript.trim()
            ? resolve({ transcript: transcript.trim() })
            : reject(new Error('Listening timed out')),
        )
      }, pauseMs)
    }

    rec.onresult = (event: unknown) => {
      const ev = event as SpeechRecognitionResultEventLike
      const results = ev?.results
      if (!results?.length) return
      const lastResult = results[results.length - 1]
      const nextTranscript = lastResult?.[0]?.transcript?.toString?.() || ''
      if (nextTranscript) transcript = nextTranscript
      resetPauseTimer()
    }
    rec.onerror = (e: unknown) => {
      const msg = (e as { error?: string } | undefined)?.error || 'Speech recognition error'
      // "no-speech" is not fatal — let the pause/total timers handle it
      if (msg === 'no-speech') return
      window.clearTimeout(totalTimer)
      window.clearTimeout(pauseTimer)
      finish(() => reject(new Error(msg)))
    }
    rec.onend = () => {
      if (done) return
      // If recognition ended too quickly (< 1.5s) and we haven't retried, restart it
      if (!retried && Date.now() - startedAt < 1500) {
        retried = true
        try {
          rec.start()
          startedAt = Date.now()
          return
        } catch {
          // fall through to normal end handling
        }
      }
      window.clearTimeout(totalTimer)
      window.clearTimeout(pauseTimer)
      if (transcript.trim()) {
        finish(() => resolve({ transcript: transcript.trim() }))
        return
      }
      finish(() => reject(new Error('No speech detected')))
    }

    try {
      rec.start()
      startedAt = Date.now()
    } catch (e: unknown) {
      window.clearTimeout(totalTimer)
      window.clearTimeout(pauseTimer)
      finish(() => reject(e))
    }
  })
}
