// Import this from a screen-record demo script to timestamp key moments:
//
//   import { mark, saveMarks } from "/home/<you>/.claude/skills/narrated-demo/marks.mjs"
//   export async function run(r) {
//     mark("start")        // first line of run(), so times line up with the video
//     ...
//     mark("end")
//     saveMarks("marks.json")
//   }
import fs from "node:fs"

const marks = []

export function mark(name) {
  if (marks.some((m) => m.name === name)) throw new Error(`Duplicate mark "${name}"`)
  marks.push({ name, ms: Date.now() })
}

export function saveMarks(file = "marks.json") {
  fs.writeFileSync(file, JSON.stringify(marks, null, 1))
}
