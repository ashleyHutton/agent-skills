// Generates one speech clip per line of script.json and checks each scene line
// fits between its marks. Usage: node narrate.mjs [workdir]
import fs from "node:fs"
import path from "node:path"
import { RECORD_DIR, readJson, sceneTimes } from "./lib.mjs"

const dir = path.resolve(process.argv[2] || ".")
const script = readJson(path.join(dir, "script.json"))
const at = sceneTimes(path.join(dir, "marks.json"))
const { Narrator } = await import(path.join(RECORD_DIR, "narrator.mjs"))
const { SAMPLE_RATE } = await import(path.join(RECORD_DIR, "sound.mjs"))

const voice = script.voice || "bm_george"
const speed = script.speed || 0.95
const narrator = await Narrator.load({ voice, speed })
const clipDir = path.join(dir, "clips")
fs.rmSync(clipDir, { recursive: true, force: true })
fs.mkdirSync(clipDir)

const lines = [
  { id: "intro", text: script.intro },
  ...script.scenes.map((s, i) => ({ id: `scene${i + 1}`, ...s })),
  { id: "outro", text: script.outro }
]
let over = 0
console.log("line     words  speech   slot   status")
for (const line of lines) {
  for (const key of ["at", "until"]) {
    if (line[key] && at[line[key]] === undefined) throw new Error(`${line.id}: no mark named "${line[key]}" in marks.json`)
  }
  const audio = await narrator.clip(line.text)
  writeWav(path.join(clipDir, `${line.id}.wav`), audio, SAMPLE_RATE)
  const speech = audio.length / SAMPLE_RATE
  const words = line.text.trim().split(/\s+/).length
  let slot = "", status = ""
  if (line.at) {
    const len = at[line.until] - at[line.at]
    // Every line starts the same lead after its mark, so a line fits if it ends before the next one starts.
    slot = `${len.toFixed(2)}s`
    status = speech > len ? `OVER by ${(speech - len).toFixed(2)}s` : `fits, ${Math.floor((len - speech) * words / speech)} words spare`
    if (speech > len) over++
  }
  console.log(`${line.id.padEnd(8)} ${String(words).padStart(5)}  ${speech.toFixed(2).padStart(5)}s  ${slot.padStart(6)}   ${status}`)
}
console.log(over ? `\n${over} line(s) don't fit. Trim them, or add r.pause() to those scenes and re-record.` : "\nAll scene lines fit.")
process.exit(over ? 1 : 0)

function writeWav(file, samples, rate) {
  const pcm = Buffer.alloc(samples.length * 2)
  samples.forEach((v, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2))
  const h = Buffer.alloc(44)
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40)
  fs.writeFileSync(file, Buffer.concat([h, pcm]))
}
