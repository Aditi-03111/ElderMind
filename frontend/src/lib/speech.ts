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

export function listenOnce({
  lang = 'en-IN',
  timeoutMs = 9000,
}: {
  lang?: string
  timeoutMs?: number
}): Promise<{ transcript: string }> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return reject(new Error('SpeechRecognition not supported in this browser'))

    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1

    let done = false
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

    const timer = window.setTimeout(() => {
      finish(() => reject(new Error('Listening timed out')))
    }, timeoutMs)

    rec.onresult = (event: unknown) => {
      const ev = event as SpeechRecognitionResultEventLike
      const transcript = ev?.results?.[0]?.[0]?.transcript?.toString?.() || ''
      window.clearTimeout(timer)
      finish(() => resolve({ transcript }))
    }
    rec.onerror = (e: unknown) => {
      window.clearTimeout(timer)
      const msg = (e as { error?: string } | undefined)?.error || 'Speech recognition error'
      finish(() => reject(new Error(msg)))
    }
    rec.onend = () => {
      // ignore: timer/handlers resolve or reject
    }

    try {
      rec.start()
    } catch (e: unknown) {
      window.clearTimeout(timer)
      finish(() => reject(e))
    }
  })
}

