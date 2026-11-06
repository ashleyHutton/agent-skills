// Speaks captions with Kokoro, a local text-to-speech model. The package is
// large, so it's only loaded for --narrate.
import { SAMPLE_RATE } from "./sound.mjs"

export class Narrator {
  static async load({ voice, speed }) {
    let KokoroTTS
    try {
      ({ KokoroTTS } = await import("kokoro-js"))
    } catch {
      throw new Error("--narrate needs kokoro-js. In the skill's directory, run: npm install --no-save kokoro-js")
    }
    const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" })
    return new Narrator(tts, voice, speed)
  }

  constructor(tts, voice, speed) {
    this.tts = tts
    this.voice = voice
    this.speed = speed
    this.clips = new Map()
  }

  async clip(text) {
    if (!this.clips.has(text)) {
      const { audio, sampling_rate: rate } = await this.tts.generate(text, { voice: this.voice, speed: this.speed })
      this.clips.set(text, resample(audio, rate))
    }
    return this.clips.get(text)
  }

  // Speech takes seconds to generate, which would freeze the video mid-recording.
  // So speak every literal r.caption("...") up front. Anything else is spoken when reached.
  async prepare(source) {
    const pattern = /\.caption\(\s*(["'`])((?:\\.|(?!\1).)+)\1/g
    const texts = [...source.matchAll(pattern)].map((match) => match[2].replace(/\\(.)/g, "$1"))
    for (const text of texts) await this.clip(text)
    return texts.length
  }
}

function resample(audio, rate) {
  const ratio = rate / SAMPLE_RATE
  const out = new Float32Array(Math.floor(audio.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const position = i * ratio
    const low = Math.floor(position)
    const high = Math.min(low + 1, audio.length - 1)
    out[i] = audio[low] + (audio[high] - audio[low]) * (position - low)
  }
  return out
}
