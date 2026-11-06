// Builds a recording's audio track: synthesized key and mouse sounds, plus any
// narration clips, all placed by timestamp. There are no sound files to license.
export const SAMPLE_RATE = 48000

// Small seeded generator, so a re-recording doesn't change its sound.
function random(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A burst of brightened noise for the keycap, over a short low thump for the desk.
function keySound(rand, heavy) {
  const length = Math.round(SAMPLE_RATE * 0.06)
  const out = new Float32Array(length)
  const pitch = (heavy ? 140 : 210) * (0.9 + rand() * 0.2)
  const gain = (heavy ? 0.3 : 0.22) * (0.8 + rand() * 0.4)
  const decay = (heavy ? 0.011 : 0.007) * (0.85 + rand() * 0.3)
  let previous = 0
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE
    const noise = rand() * 2 - 1
    const bright = noise - previous * 0.82
    previous = noise
    out[i] = gain * (bright * 0.55 * Math.exp(-t / decay) + Math.sin(2 * Math.PI * pitch * t) * 0.7 * Math.exp(-t / 0.014))
  }
  return out
}

// Sharper and shorter than a key, with the release quieter than the press.
function mouseSound(rand, release) {
  const length = Math.round(SAMPLE_RATE * 0.03)
  const out = new Float32Array(length)
  const pitch = (release ? 2600 : 2000) * (0.97 + rand() * 0.06)
  const gain = release ? 0.2 : 0.34
  let previous = 0
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE
    const noise = rand() * 2 - 1
    const bright = noise - previous * 0.9
    previous = noise
    out[i] = gain * (bright * 0.5 + Math.sin(2 * Math.PI * pitch * t) * 0.6) * Math.exp(-t / 0.0028)
  }
  return out
}

// events: { kind, t } with t in epoch milliseconds. kind is "key", "key-heavy",
// "mouse-down", "mouse-up", or "narration" with a samples array at SAMPLE_RATE.
// Effects drop under narration so the voice stays clear.
export function buildWav(events, startMs, durationMs) {
  const rand = random(1)
  const mix = new Float32Array(Math.ceil((durationMs / 1000) * SAMPLE_RATE))
  const offset = (t) => Math.round(((t - startMs) / 1000) * SAMPLE_RATE)
  const add = (samples, at, gain = 1) => {
    if (at < 0) return
    for (let i = 0; i < samples.length && at + i < mix.length; i++) mix[at + i] += samples[i] * gain
  }

  const narration = events.filter((event) => event.kind === "narration")
  const spoken = narration.map((event) => [offset(event.t), offset(event.t) + event.samples.length])
  const duck = (at) => (spoken.some(([from, to]) => at >= from && at < to) ? 0.45 : 1)

  for (const event of events) {
    const at = offset(event.t)
    if (event.kind === "key") add(keySound(rand, false), at, duck(at))
    else if (event.kind === "key-heavy") add(keySound(rand, true), at, duck(at))
    else if (event.kind === "mouse-down") add(mouseSound(rand, false), at, duck(at))
    else if (event.kind === "mouse-up") add(mouseSound(rand, true), at, duck(at))
  }
  for (const event of narration) add(event.samples, offset(event.t))

  const peak = mix.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
  const scale = peak > 0.95 ? 0.95 / peak : 1

  const wav = Buffer.alloc(44 + mix.length * 2)
  wav.write("RIFF", 0)
  wav.writeUInt32LE(36 + mix.length * 2, 4)
  wav.write("WAVEfmt ", 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(SAMPLE_RATE, 24)
  wav.writeUInt32LE(SAMPLE_RATE * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write("data", 36)
  wav.writeUInt32LE(mix.length * 2, 40)
  mix.forEach((value, i) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value * scale)) * 32767), 44 + i * 2))
  return wav
}
