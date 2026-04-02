export type SpeechSupport = {
  stt: boolean
  tts: boolean
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnySpeechRecognition = any
/* eslint-enable @typescript-eslint/no-explicit-any */

function getSR(): (new () => AnySpeechRecognition) | null {
  const w = window as Record<string, unknown>
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => AnySpeechRecognition) | null
}

export function getSpeechSupport(): SpeechSupport {
  const stt = typeof window !== 'undefined' && getSR() !== null
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
  timeoutMs = 20000,
  silenceMs = 10000,
}: {
  lang?: string
  timeoutMs?: number
  silenceMs?: number
}): Promise<{ transcript: string }> {
  return new Promise((resolve, reject) => {
    const SR = getSR()
    if (!SR) return reject(new Error('SpeechRecognition not supported in this browser'))

    const rec = new SR()
    rec.lang = lang
    rec.interimResults = true
    rec.maxAlternatives = 1

    let settled = false
    let finalParts: string[] = []
    let interimText = ''

    const L = (...a: unknown[]) => console.log('%c[Bhumi STT]', 'color:#3B8C6E;font-weight:bold', ...a)

    const getFullTranscript = () => (finalParts.join(' ') + (interimText ? ' ' + interimText : '')).trim()

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(hardStop)
      window.clearTimeout(silenceTimer)
      try { rec.stop() } catch { /* ignore */ }
      fn()
    }

    const hardStop = window.setTimeout(() => {
      const text = getFullTranscript()
      L('⏱ Hard stop 15s', { text })
      finish(() => {
        if (text) resolve({ transcript: text })
        else reject(new Error('Listening timed out'))
      })
    }, timeoutMs)

    let silenceTimer = -1
    const resetSilenceTimer = () => {
      window.clearTimeout(silenceTimer)
      silenceTimer = window.setTimeout(() => {
        const text = getFullTranscript()
        L('🔇 Silence 7s', { text })
        finish(() => {
          if (text) resolve({ transcript: text })
          else reject(new Error('No speech detected'))
        })
      }, silenceMs)
    }

    // Don't start silence timer yet — wait for onspeechstart
    // Hard stop at 20s catches the case where user never speaks

    rec.onaudiostart = () => L('🎤 Mic opened')
    rec.onspeechstart = () => {
      L('🗣 Speech started')
      // NOW start the silence timer — not before
      resetSilenceTimer()
    }
    rec.onspeechend = () => L('🗣 Speech ended')

    rec.onresult = (event: AnySpeechRecognition) => {
      const results = event.results
      if (!results || !results.length) { L('❌ onresult but no results'); return }

      finalParts = []
      interimText = ''
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const text = result?.[0]?.transcript || ''
        if (result.isFinal) {
          finalParts.push(text)
        } else {
          interimText = text
        }
      }
      L('📝 Result:', { final: finalParts, interim: interimText, full: getFullTranscript() })
      resetSilenceTimer()
    }

    let abortCount = 0

    rec.onerror = (e: AnySpeechRecognition) => {
      const msg = e?.error || 'Speech recognition error'
      L('⚠️ Error:', msg)
      if (msg === 'aborted') { abortCount++; return }
      if (msg === 'no-speech' || msg === 'network') return
      finish(() => reject(new Error(msg)))
    }

    rec.onend = () => {
      L('🔚 onend', { settled, transcript: getFullTranscript(), abortCount })
      if (settled) return
      // If too many aborts, wait longer before retrying
      const delay = abortCount > 3 ? 1000 : 300
      window.setTimeout(() => {
        if (settled) return
        try {
          rec.start()
          L('🔄 Restarted (delay:', delay, 'ms)')
        } catch (err) {
          L('💀 Restart failed:', err)
        }
      }, delay)
    }

    try {
      rec.start()
      L('🚀 Started', { lang, timeoutMs, silenceMs })
    } catch (e: unknown) {
      L('💀 Start failed:', e)
      window.clearTimeout(hardStop)
      window.clearTimeout(silenceTimer)
      reject(e)
    }
  })
}
