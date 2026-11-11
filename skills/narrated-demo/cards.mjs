// Renders intro.png and outro.png from script.json's cards, sized to match
// base.mp4. Usage: node cards.mjs [workdir]
import fs from "node:fs"
import path from "node:path"
import { RECORD_DIR, readJson, probe } from "./lib.mjs"

const dir = path.resolve(process.argv[2] || ".")
const { cards, theme = {} } = readJson(path.join(dir, "script.json"))
const { width, height } = probe(path.join(dir, "base.mp4"))
const { chromium } = await import(path.join(RECORD_DIR, "node_modules/playwright-core/index.mjs"))

const config = path.join(process.env.HOME, ".agent-browser/config.json")
const executablePath = process.env.REC_CHROME || (fs.existsSync(config) ? JSON.parse(fs.readFileSync(config, "utf8")).executablePath : undefined)
const browser = await chromium.launch({ executablePath })
const page = await browser.newPage({ viewport: { width: width / 2, height: height / 2 }, deviceScaleFactor: 2 })
const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")
const { bg = "#252b4d", fg = "#ffffff", accent = "#8fc1ee", muted = "#d4d9ea" } = theme

for (const name of ["intro", "outro"]) {
  const c = cards[name]
  await page.setContent(`<body style="margin:0;height:100vh;display:flex;flex-direction:column;justify-content:center;padding:0 9%;box-sizing:border-box;background:${bg};color:${fg};font-family:system-ui,Helvetica,Arial,sans-serif">
    <div style="font-size:24px;letter-spacing:.14em;color:${accent};font-weight:600;text-transform:uppercase">${esc(c.eyebrow)}</div>
    <div style="font-size:62px;font-weight:700;line-height:1.14;margin:22px 0 26px">${esc(c.title)}</div>
    <div style="font-size:28px;line-height:1.45;color:${muted}">${esc(c.subtitle)}</div></body>`)
  await page.screenshot({ path: path.join(dir, `${name}.png`) })
  console.log(`${name}.png ${width}x${height}`)
}
await browser.close()
