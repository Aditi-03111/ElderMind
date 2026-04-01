export type SpeechSupport = {
  stt: boolean
  tts: boolean
}

export function getSpeechSupport(): SpeechSupport {
  const stt = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
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
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
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
      } catch {}
      fn()
    }

    const timer = window.setTimeout(() => {
      finish(() => reject(new Error('Listening timed out')))
    }, timeoutMs)

    rec.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.toString?.() || ''
      window.clearTimeout(timer)
      finish(() => resolve({ transcript }))
    }
    rec.onerror = (e: any) => {
      window.clearTimeout(timer)
      finish(() => reject(new Error(e?.error || 'Speech recognition error')))
    }
    rec.onend = () => {
      // ignore: timer/handlers resolve or reject
    }

    try {
      rec.start()
    } catch (e: any) {
      window.clearTimeout(timer)
      finish(() => reject(e))
    }
  })
}

