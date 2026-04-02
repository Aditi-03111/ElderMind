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
  timeoutMs = 30000,
  pauseMs = 4000,
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

    let settled = false
    let transcript = ''
    let hasSpoken = false

    const cleanup = () => {
      window.clearTimeout(totalTimer)
      window.clearTimeout(pauseTimer)
      try { rec.stop() } catch { /* ignore */ }
    }

    const succeed = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve({ transcript: transcript.trim() })
    }

    const fail = (msg: string) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(msg))
    }

    // Hard stop after timeoutMs no matter what
    const totalTimer = window.setTimeout(() => {
      if (transcript.trim()) succeed()
      else fail('Listening timed out')
    }, timeoutMs)

    // Pause timer — resolves after silence once user has spoken
    let pauseTimer = -1
    const resetPauseTimer = () => {
      window.clearTimeout(pauseTimer)
      if (hasSpoken) {
        pauseTimer = window.setTimeout(() => {
          if (transcript.trim()) succeed()
        }, pauseMs)
      }
    }

    rec.onresult = (event: unknown) => {
      const ev = event as SpeechRecognitionResultEventLike
      const results = ev?.results
      if (!results?.length) return
      const lastResult = results[results.length - 1]
      const nextTranscript = lastResult?.[0]?.transcript?.toString?.() || ''
      if (nextTranscript) {
        transcript = nextTranscript
        hasSpoken = true
      }
      resetPauseTimer()
    }

    rec.onerror = (e: unknown) => {
      const msg = (e as { error?: string } | undefined)?.error || 'Speech recognition error'
      // These are non-fatal — keep listening
      if (msg === 'no-speech' || msg === 'aborted') return
      // "not-allowed" means mic permission denied — that's fatal
      fail(msg)
    }

    rec.onend = () => {
      if (settled) return
      // Browser killed recognition — restart it to keep listening
      // (Chrome stops after ~5-10s of silence, this keeps us alive)
      if (transcript.trim() && hasSpoken) {
        // User spoke and then there was silence — resolve with what we have
        succeed()
        return
      }
      // No transcript yet — restart and keep listening
      try {
        rec.start()
      } catch {
        fail('No speech detected')
      }
    }

    try {
      rec.start()
    } catch (e: unknown) {
      cleanup()
      reject(e)
    }
  })
}
