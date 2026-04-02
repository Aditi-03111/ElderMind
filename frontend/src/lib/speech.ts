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
  timeoutMs = 15000,
  silenceMs = 7000,
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
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    let settled = false
    let transcript = ''
    let silenceTimer = -1

    const log = (...args: unknown[]) => console.log('[Bhumi STT]', ...args)

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(hardStop)
      window.clearTimeout(silenceTimer)
      try { rec.stop() } catch { /* ignore */ }
      fn()
    }

    // --- Hard stop: 15s max ---
    const hardStop = window.setTimeout(() => {
      log('Hard stop reached', { transcript })
      finish(() => {
        if (transcript.trim()) resolve({ transcript: transcript.trim() })
        else reject(new Error('Listening timed out'))
      })
    }, timeoutMs)

    // --- Silence timer: resets every time speech is detected ---
    const resetSilenceTimer = () => {
      window.clearTimeout(silenceTimer)
      silenceTimer = window.setTimeout(() => {
        log('Silence timer fired', { transcript })
        finish(() => {
          if (transcript.trim()) resolve({ transcript: transcript.trim() })
          else reject(new Error('No speech detected'))
        })
      }, silenceMs)
    }

    // Start initial silence timer
    resetSilenceTimer()

    rec.onresult = (event: AnySpeechRecognition) => {
      const results = event.results
      log('onresult fired', { resultCount: results?.length })
      if (!results || !results.length) return
      // Build full transcript from all results — use simple bracket access
      let full = ''
      for (let i = 0; i < results.length; i++) {
        const alt = results[i]?.[0]
        if (alt?.transcript) full += alt.transcript
      }
      log('Parsed transcript:', full)
      if (full) transcript = full
      resetSilenceTimer()
    }

    rec.onaudiostart = () => log('Audio capture started')
    rec.onsoundstart = () => log('Sound detected')
    rec.onspeechstart = () => log('Speech detected')
    rec.onspeechend = () => log('Speech ended')

    rec.onerror = (e: AnySpeechRecognition) => {
      const msg = e?.error || 'Speech recognition error'
      log('onerror:', msg)
      // Non-fatal errors — keep listening
      if (msg === 'no-speech' || msg === 'aborted' || msg === 'network') return
      finish(() => reject(new Error(msg)))
    }

    rec.onend = () => {
      log('onend fired', { settled, transcript })
      if (settled) return
      // Browser killed recognition — restart
      try {
        rec.start()
        log('Restarted after onend')
      } catch (err) {
        log('Failed to restart:', err)
      }
    }

    try {
      rec.start()
      log('Started', { lang, timeoutMs, silenceMs })
    } catch (e: unknown) {
      log('Failed to start:', e)
      window.clearTimeout(hardStop)
      window.clearTimeout(silenceTimer)
      reject(e)
    }
  })
}
