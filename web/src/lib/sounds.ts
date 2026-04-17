let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

function playTone(audio: AudioContext, freq: number, startAt: number, duration: number, peakGain: number) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain).connect(audio.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

export function playSuccessDing() {
  try {
    const audio = getCtx()
    if (!audio) return
    if (audio.state === 'suspended') audio.resume()
    const now = audio.currentTime
    playTone(audio, 1046.5, now, 0.18, 0.08)
    playTone(audio, 1318.5, now + 0.12, 0.22, 0.08)
  } catch {
    // no-op
  }
}
