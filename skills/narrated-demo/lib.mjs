// Shared paths and helpers. Capture, speech, ffmpeg, and Playwright all come
// from the sibling screen-record skill, so this skill has no dependencies of its own.
import fs from "node:fs"
import path from "node:path"
import { execFileSync, spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

export const SKILL_DIR = path.dirname(fs.realpathSync(fileURLToPath(import.meta.url)))
export const RECORD_DIR = path.resolve(SKILL_DIR, "../screen-record")
export const FFMPEG = path.join(RECORD_DIR, "node_modules/ffmpeg-static/ffmpeg")

if (!fs.existsSync(FFMPEG)) {
  throw new Error(`screen-record's dependencies are missing. Run: cd ${RECORD_DIR} && npm ci`)
}

export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"))

export function probe(file) {
  const out = spawnSync(FFMPEG, ["-hide_banner", "-i", file], { encoding: "utf8" }).stderr
  const d = out.match(/Duration: (\d+):(\d+):([\d.]+)/)
  const size = out.match(/Video: .*?, (\d{2,5})x(\d{2,5})/)
  if (!d || !size) throw new Error(`Can't read duration and size of ${file}`)
  return { duration: Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]), width: Number(size[1]), height: Number(size[2]) }
}

export function ffmpeg(args) {
  execFileSync(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" })
}

export function wavSeconds(file) {
  const buf = fs.readFileSync(file)
  return buf.readUInt32LE(40) / buf.readUInt32LE(28)
}

// Marks are milliseconds since the first mark. Returns { name: seconds }.
export function sceneTimes(marksFile) {
  const marks = readJson(marksFile)
  return Object.fromEntries(marks.map((m) => [m.name, (m.ms - marks[0].ms) / 1000]))
}
