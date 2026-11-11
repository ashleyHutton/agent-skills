// Joins intro card + base.mp4 + outro card, places each narration clip at its
// mark, ducks the key and click sounds under the voice, then checks the result.
// Usage: node build.mjs [workdir] -o final.mp4
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { FFMPEG, ffmpeg, probe, readJson, sceneTimes, wavSeconds } from "./lib.mjs"

const args = process.argv.slice(2)
const outIndex = args.indexOf("-o")
if (outIndex < 0) { console.error("usage: node build.mjs [workdir] -o final.mp4"); process.exit(2) }
const out = path.resolve(args[outIndex + 1])
const dir = path.resolve(args.filter((_, i) => i !== outIndex && i !== outIndex + 1)[0] || ".")
const file = (name) => path.join(dir, name)

const script = readJson(file("script.json"))
const at = sceneTimes(file("marks.json"))
const base = probe(file("base.mp4"))
const lead = script.lead ?? 0.15
const clip = (id) => wavSeconds(file(`clips/${id}.wav`))
const intro = +(clip("intro") + 1.1).toFixed(2)
const outro = +(clip("outro") + 1.3).toFixed(2)
const total = intro + base.duration + outro

const schedule = [
  { id: "intro", t: 0.45 },
  ...script.scenes.map((s, i) => ({ id: `scene${i + 1}`, t: intro + at[s.at] + lead })),
  { id: "outro", t: intro + base.duration + 0.5 }
].map((s) => ({ ...s, end: s.t + clip(s.id) }))

for (let i = 1; i < schedule.length; i++) {
  if (schedule[i - 1].end > schedule[i].t) {
    throw new Error(`${schedule[i - 1].id} runs into ${schedule[i].id}. Run narrate.mjs and fix the lines it marks OVER.`)
  }
}
console.log(`intro card ${intro}s + demo ${base.duration.toFixed(2)}s + outro card ${outro}s = ${total.toFixed(2)}s`)
for (const s of schedule) console.log(`  ${s.id.padEnd(8)} ${s.t.toFixed(2)} -> ${s.end.toFixed(2)}`)

const fade = 0.35
const v = "fps=60,format=yuv420p,setsar=1"
const filters = [
  `[1:v]${v},fade=t=out:st=${(intro - fade).toFixed(2)}:d=${fade}[iv]`,
  `[0:v]${v}[bv]`,
  `[2:v]${v},fade=t=in:st=0:d=${fade}[ov]`,
  `[iv][bv][ov]concat=n=3:v=1:a=0[v]`,
  `[0:a]aresample=48000,adelay=${Math.round(intro * 1000)}:all=1,volume=0.8[sfx]`,
  ...schedule.map((s, i) => `[${i + 3}:a]aresample=48000,aformat=channel_layouts=mono,adelay=${Math.round(s.t * 1000)}:all=1[n${i}]`),
  `${schedule.map((_, i) => `[n${i}]`).join("")}amix=inputs=${schedule.length}:normalize=0,asplit=2[narr][key]`,
  `[sfx][key]sidechaincompress=threshold=0.012:ratio=10:attack=15:release=350[duck]`,
  `[duck][narr]amix=inputs=2:normalize=0,atrim=0:${total.toFixed(3)},alimiter=limit=0.95[a]`
]
ffmpeg([
  "-i", file("base.mp4"),
  "-loop", "1", "-t", String(intro), "-i", file("intro.png"),
  "-loop", "1", "-t", String(outro), "-i", file("outro.png"),
  ...schedule.flatMap((s) => ["-i", file(`clips/${s.id}.wav`)]),
  "-filter_complex", filters.join(";"), "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out
])

// Checks: speech gaps should fall between the scheduled lines, and the peak should stay under 0 dB.
const analysis = spawnSync(FFMPEG, ["-hide_banner", "-i", out, "-vn", "-af", "silencedetect=noise=-38dB:d=0.45,volumedetect", "-f", "null", "-"], { encoding: "utf8" }).stderr
const gaps = [...analysis.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((m) => `${(m[1] - m[2]).toFixed(1)}-${Number(m[1]).toFixed(1)}`)
const peak = analysis.match(/max_volume: (-?[\d.]+) dB/)?.[1]
const sheet = path.join(dir, "sheet.png")
ffmpeg(["-i", out, "-vf", `fps=1/${Math.max(1, total / 16).toFixed(2)},scale=640:-1,tile=4x4:padding=4`, "-frames:v", "1", sheet])
console.log(JSON.stringify({ out, bytes: fs.statSync(out).size, seconds: +total.toFixed(2), silences: gaps, peakDb: Number(peak), contactSheet: sheet }, null, 2))
