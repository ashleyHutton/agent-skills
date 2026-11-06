#!/usr/bin/env node
// rec: record a scripted browser demo to MP4, with a visible cursor, click
// ripples, a keystroke display, key and click sounds, and optional narration.
//
//   node rec.mjs demo.mjs -o out.mp4 [--base URL] [--size 1280x800] [--fps 60] [--scale 2]
//     [--no-sound] [--narrate] [--voice bm_george] [--speed 0.95] [--keep-frames]
//
// A demo is a module that exports `run(r)` and optionally `setup(r)`. Setup is
// not recorded, so use it to sign in. See the methods on Recorder below.
//
// Input is real (CDP mouse and keyboard events), so a click that wouldn't work
// for a person fails here too. Pixels come from Page.startScreencast, whose
// frames carry timestamps, so pauses keep their true length in the video.
import { chromium } from "playwright-core"
import ffmpegPath from "ffmpeg-static"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { Narrator } from "./narrator.mjs"
import { SAMPLE_RATE, buildWav } from "./sound.mjs"

// Set REC_CHROME to override. Otherwise uses the browser agent-browser is configured with.
function chromePath() {
  if (process.env.REC_CHROME) return process.env.REC_CHROME
  const config = path.join(os.homedir(), ".agent-browser/config.json")
  const configured = fs.existsSync(config) && JSON.parse(fs.readFileSync(config, "utf8")).executablePath
  if (configured) return configured
  throw new Error("No browser found. Set REC_CHROME to a current Chrome binary.")
}

// Headless Chrome's window is this much taller than its page.
const WINDOW_CHROME_HEIGHT = 87

// Runs in the page. The overlay is a manual popover on <html>: outside <body>
// so Turbo keeps it across visits, and in the top layer so it can sit above an
// open <dialog>, which z-index can't do.
const OVERLAY = () => {
  if (window.__rec) return
  const KEY = "__rec_cursor"
  const css = `
    #__rec { all: initial; position: fixed; inset: 0; width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: transparent; overflow: hidden; pointer-events: none; }
    #__rec * { pointer-events: none; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    #__rec_cursor { position: absolute; left: 0; top: 0; width: 26px; height: 26px; will-change: transform; filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); }
    #__rec_cursor svg { width: 100%; height: 100%; transition: transform 90ms ease-out; transform-origin: 4px 3px; display: block; }
    #__rec_cursor.down svg { transform: scale(.82); }
    .__rec_ripple { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; border: 3px solid rgba(37, 99, 235, .85); background: rgba(37, 99, 235, .18); animation: __rec_ripple 520ms ease-out forwards; }
    @keyframes __rec_ripple { from { transform: scale(.25); opacity: 1; } to { transform: scale(1.35); opacity: 0; } }
    #__rec_keys { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); max-width: 70%; padding: 10px 18px; border-radius: 12px; background: rgba(17, 24, 39, .86); color: #fff; font-size: 22px; font-weight: 500; white-space: pre; overflow: hidden; opacity: 0; transition: opacity 220ms; display: flex; justify-content: flex-end; }
    #__rec_caption { position: absolute; right: 16px; bottom: 16px; max-width: 80%; padding: 9px 18px; border-radius: 999px; background: rgba(17, 24, 39, .9); color: #fff; font-size: 17px; font-weight: 500; white-space: nowrap; opacity: 0; transition: opacity 260ms; }
    .profiler-results { display: none !important; }
  `
  const saved = JSON.parse(sessionStorage.getItem(KEY) || "null") || { x: innerWidth / 2, y: innerHeight / 2 }
  let root, cursor, keys, caption
  let typed = ""
  let hideKeys

  const place = (x, y) => {
    saved.x = x
    saved.y = y
    if (cursor) cursor.style.transform = `translate(${x - 4}px, ${y - 3}px)`
  }

  const raise = () => {
    if (!root?.isConnected) return
    if (root.matches(":popover-open")) root.hidePopover()
    root.showPopover()
  }

  const build = () => {
    if (root?.isConnected || !document.documentElement) return
    document.documentElement.spellcheck = false
    const style = document.createElement("style")
    style.textContent = css
    document.documentElement.appendChild(style)

    root = document.createElement("div")
    root.id = "__rec"
    root.setAttribute("popover", "manual")
    root.innerHTML = `
      <div id="__rec_caption"></div>
      <div id="__rec_keys"></div>
      <div id="__rec_cursor"><svg viewBox="0 0 24 24"><path d="M4 2.5 L4 20 L8.8 15.6 L12 22.4 L15 21 L11.9 14.4 L18.4 14 Z" fill="#111827" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></div>`
    document.documentElement.appendChild(root)
    cursor = root.querySelector("#__rec_cursor")
    keys = root.querySelector("#__rec_keys")
    caption = root.querySelector("#__rec_caption")
    place(saved.x, saved.y)
    raise()
  }

  const showKeys = (text) => {
    if (!keys) return
    keys.textContent = text
    keys.style.opacity = 1
    clearTimeout(hideKeys)
    hideKeys = setTimeout(() => {
      keys.style.opacity = 0
      typed = ""
    }, 1300)
  }

  addEventListener("mousemove", (e) => place(e.clientX, e.clientY), true)
  const report = (kind) => window.__recEvent?.({ kind, t: Date.now() })
  addEventListener("mousedown", (e) => {
    report("mouse-down")
    cursor?.classList.add("down")
    const ripple = document.createElement("div")
    ripple.className = "__rec_ripple"
    ripple.style.left = `${e.clientX}px`
    ripple.style.top = `${e.clientY}px`
    root?.appendChild(ripple)
    setTimeout(() => ripple.remove(), 560)
  }, true)
  addEventListener("mouseup", () => {
    report("mouse-up")
    cursor?.classList.remove("down")
  }, true)

  const NAMED = { Enter: "⏎ Enter", Tab: "⇥ Tab", Escape: "Esc", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" }
  addEventListener("keydown", (e) => {
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return
    if (!e.repeat) report([" ", "Enter", "Backspace", "Tab"].includes(e.key) ? "key-heavy" : "key")
    const combo = e.ctrlKey || e.metaKey || e.altKey
    if (e.key === "Backspace") {
      typed = typed.slice(0, -1)
    } else if (!combo && e.key.length === 1) {
      typed += e.target?.type === "password" ? "•" : e.key
    } else {
      const name = NAMED[e.key] || e.key
      typed = [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.metaKey && "⌘", name].filter(Boolean).join(" + ")
      showKeys(typed)
      typed = ""
      return
    }
    showKeys(typed)
  }, true)

  // A dialog or popover that opens goes above the overlay in the top layer, so
  // go above it again. Popovers don't change an attribute, so listen for their
  // toggle event, which doesn't bubble but can be captured.
  new MutationObserver(raise).observe(document, { subtree: true, attributes: true, attributeFilter: ["open"] })
  addEventListener("toggle", (e) => {
    if (e.target !== root && e.newState === "open") raise()
  }, true)

  addEventListener("pagehide", () => sessionStorage.setItem(KEY, JSON.stringify(saved)))

  build()
  document.addEventListener("DOMContentLoaded", build)
  setInterval(build, 200)

  window.__rec = {
    place,
    keys: showKeys,
    caption: (text) => {
      if (!caption) return
      caption.textContent = text || ""
      caption.style.opacity = text ? 1 : 0
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

class Recorder {
  constructor(page, base, narrator, events) {
    this.page = page
    this.base = base
    this.narrator = narrator
    this.events = events
    this.narrationEnds = 0
    this.x = 640
    this.y = 400
    this.log = []
  }

  step(name) {
    this.log.push({ at: Date.now(), name })
    console.log(`  ${name}`)
  }

  url(path) {
    return path.startsWith("http") ? path : `${this.base}${path}`
  }

  // Fails on an error status, so a demo can't silently record an error page.
  async goto(path) {
    this.step(`goto ${path}`)
    const response = await this.page.goto(this.url(path), { waitUntil: "load" })
    if (!response.ok()) throw new Error(`${path} returned ${response.status()}`)
    await this.settle()
  }

  // Accepts a CSS/Playwright selector string or a Playwright locator.
  locator(target) {
    return typeof target === "string" ? this.page.locator(target).first() : target
  }

  async moveTo(target) {
    const locator = this.locator(target)
    await locator.waitFor({ state: "visible", timeout: 10000 })
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    await this.glide(box.x + box.width / 2, box.y + box.height / 2)
  }

  async glide(x, y) {
    const distance = Math.hypot(x - this.x, y - this.y)
    const duration = Math.min(900, Math.max(280, distance * 1.1))
    const started = Date.now()
    const fromX = this.x
    const fromY = this.y
    // Bow the path a little so it doesn't look like a ruler.
    const bow = Math.min(40, distance * 0.08)
    for (;;) {
      const t = Math.min(1, (Date.now() - started) / duration)
      const e = ease(t)
      const arc = Math.sin(Math.PI * t) * bow
      this.x = fromX + (x - fromX) * e
      this.y = fromY + (y - fromY) * e - arc
      await this.page.mouse.move(this.x, this.y)
      if (t === 1) break
      await sleep(12)
    }
  }

  async click(target, { settle = true } = {}) {
    this.step(`click ${target}`)
    await this.moveTo(target)
    await sleep(140)
    await this.page.mouse.down()
    await sleep(80)
    await this.page.mouse.up()
    if (settle) await this.settle()
  }

  async hover(target) {
    this.step(`hover ${target}`)
    await this.moveTo(target)
    await sleep(350)
  }

  // Clicks the field, then types one key at a time. `clear` empties it first.
  async type(target, text, { clear = false, delay = 75 } = {}) {
    this.step(`type ${target}: ${text}`)
    await this.click(target, { settle: false })
    await sleep(150)
    if (clear) {
      await this.page.keyboard.press("Control+A")
      await this.page.keyboard.press("Backspace")
    }
    for (const char of text) {
      await this.page.keyboard.type(char)
      await sleep(delay + Math.random() * delay * 0.6)
    }
  }

  async press(key) {
    this.step(`press ${key}`)
    await this.page.keyboard.press(key)
    await this.settle()
  }

  // Headless Chrome doesn't paint a native <select> popup, so this moves to it,
  // sets the value, and shows the choice in the key display.
  async select(target, label) {
    this.step(`select ${target}: ${label}`)
    await this.click(target, { settle: false })
    await this.page.keyboard.press("Escape")
    await this.locator(target).selectOption({ label })
    await this.page.evaluate((text) => window.__rec?.keys(text), label)
    await sleep(500)
  }

  async scroll(deltaY, { duration = 700 } = {}) {
    this.step(`scroll ${deltaY}`)
    const steps = Math.max(1, Math.round(duration / 16))
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, deltaY / steps)
      await sleep(16)
    }
    await sleep(200)
  }

  // With --narrate, also speaks the text, or `say` if the spoken words should
  // differ. Waits for the previous line, so lines never talk over each other.
  async caption(text, { say } = {}) {
    await this.finishNarration()
    this.step(`caption ${text}`)
    const clip = text && this.narrator ? await this.narrator.clip(say || text) : null
    await this.page.evaluate((value) => window.__rec?.caption(value), text)
    if (clip) {
      this.events.push({ kind: "narration", t: Date.now(), samples: clip })
      this.narrationEnds = Date.now() + (clip.length / SAMPLE_RATE) * 1000 + 300
    }
    await sleep(250)
  }

  async finishNarration() {
    const remaining = this.narrationEnds - Date.now()
    if (remaining > 0) await sleep(remaining)
  }

  async pause(ms = 800) {
    await sleep(ms)
  }

  // Waits for network to go quiet, because Turbo visits don't fire load.
  async settle() {
    await this.page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {})
    await sleep(350)
  }

  // Fails the run, so a demo records an assertion rather than just a good-looking video.
  async expectText(text, target = "body") {
    this.step(`expect "${text}"`)
    await this.locator(target).getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 10000 })
  }

  async expectNoText(text, target = "body") {
    this.step(`expect no "${text}"`)
    const count = await this.locator(target).getByText(text, { exact: false }).count()
    if (count > 0) throw new Error(`Expected no "${text}" but found ${count}`)
  }

  // Signs out of the current browser state and starts a clean context cookie jar.
  async clearSession() {
    await this.page.context().clearCookies()
    await this.page.evaluate(() => sessionStorage.clear()).catch(() => {})
  }
}

function parseArgs(argv) {
  const args = { fps: 60, scale: 2, size: "1280x800", base: "http://localhost:3000", sound: true, voice: "bm_george", speed: 0.95 }
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "-o" || arg === "--out") args.out = argv[++i]
    else if (arg === "--base") args.base = argv[++i]
    else if (arg === "--size") args.size = argv[++i]
    else if (arg === "--fps") args.fps = Number(argv[++i])
    else if (arg === "--scale") args.scale = Number(argv[++i])
    else if (arg === "--no-sound") args.sound = false
    else if (arg === "--narrate") args.narrate = true
    else if (arg === "--voice") args.voice = argv[++i]
    else if (arg === "--speed") args.speed = Number(argv[++i])
    else if (arg === "--keep-frames") args.keep = true
    else rest.push(arg)
  }
  args.script = rest[0]
  if (!args.script || !args.out) {
    console.error("usage: rec.mjs demo.mjs -o out.mp4 [--base URL] [--size 1280x800] [--fps 60] [--scale 2] [--no-sound] [--narrate] [--voice bm_george] [--speed 0.95] [--keep-frames]")
    process.exit(2)
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const [width, height] = args.size.split("x").map(Number)
  const demo = await import(pathToFileURL(path.resolve(args.script)))
  const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), "rec-frames-"))

  let narrator
  if (args.narrate) {
    if (!args.sound) throw new Error("--narrate can't be combined with --no-sound")
    narrator = await Narrator.load(args)
    const prepared = await narrator.prepare(fs.readFileSync(args.script, "utf8"))
    console.log(`narration: ${prepared} lines ready, voice ${args.voice}`)
  }

  // Screencast frames ignore Playwright's emulated deviceScaleFactor, so real
  // sharpness needs Chrome's own flag, and no viewport override, which would
  // force the page back to 1x.
  const browser = await chromium.launch({
    executablePath: chromePath(),
    headless: true,
    args: [`--force-device-scale-factor=${args.scale}`, `--window-size=${width},${height + WINDOW_CHROME_HEIGHT}`]
  })
  const context = await browser.newContext({ viewport: null })
  const page = await context.newPage()
  const events = []
  await context.exposeFunction("__recEvent", (event) => events.push(event))
  await context.addInitScript(OVERLAY)

  const r = new Recorder(page, args.base, narrator, events)
  const problems = []
  const actual = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio])
  console.log(`page ${actual[0]}x${actual[1]} at ${actual[2]}x`)
  page.on("pageerror", (error) => problems.push(`page error during "${r.log.at(-1)?.name}": ${error.message}`))
  page.on("response", (response) => {
    if (response.status() >= 500) problems.push(`${response.status()} ${response.url()}`)
  })

  let failure
  const frames = []
  let cdp

  try {
    if (demo.setup) {
      console.log("setup (not recorded)")
      await demo.setup(r)
    }

    cdp = await context.newCDPSession(page)
    cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      const file = path.join(frameDir, `${String(frames.length).padStart(6, "0")}.jpg`)
      frames.push({ file, t: metadata.timestamp })
      fs.writeFileSync(file, Buffer.from(data, "base64"))
      cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {})
    })
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: width * args.scale, maxHeight: height * args.scale, everyNthFrame: 1 })

    // A still page sends no frames, and the video starts at the first one, so
    // get that first frame now or the opening narration lands before the video.
    await page.evaluate(() => document.documentElement.setAttribute("data-rec-started", ""))
    await page.mouse.move(r.x, r.y)
    for (let waited = 0; !frames.length && waited < 3000; waited += 50) await sleep(50)
    if (!frames.length) throw new Error("Screencast sent no frames")

    console.log("recording")
    await demo.run(r)
    await r.finishNarration()
    await sleep(800)
  } catch (error) {
    failure = error
    console.error(`\nFAILED: ${error.message}`)
  }

  if (cdp) await cdp.send("Page.stopScreencast").catch(() => {})
  await browser.close()

  if (frames.length < 2) throw failure || new Error("No frames captured")

  // The concat demuxer gives each frame its real on-screen time. fps= then
  // resamples to constant frame rate, so this adds no motion the capture lacked.
  const list = frames
    .map((frame, i) => {
      const next = frames[i + 1]
      return `file '${frame.file}'\nduration ${next ? Math.max(0.001, next.t - frame.t).toFixed(4) : 1}`
    })
    .join("\n")
  const listFile = path.join(frameDir, "list.txt")
  fs.writeFileSync(listFile, `${list}\nfile '${frames.at(-1).file}'\n`)
  // The last frame is held for one second, so the audio runs that much longer too.
  const startMs = frames[0].t * 1000
  const videoMs = (frames.at(-1).t - frames[0].t + 1) * 1000
  const audioFile = path.join(frameDir, "audio.wav")
  if (args.sound) fs.writeFileSync(audioFile, buildWav(events, startMs, videoMs))
  execFileSync(ffmpegPath, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile,
    ...(args.sound ? ["-i", audioFile, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "160k"] : []),
    "-vf", `fps=${args.fps},scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", path.resolve(args.out)])

  const duration = frames.at(-1).t - frames[0].t
  const gaps = frames.slice(1).map((frame, i) => frame.t - frames[i].t).sort((a, b) => a - b)
  console.log(JSON.stringify({
    out: path.resolve(args.out),
    bytes: fs.statSync(args.out).size,
    durationSeconds: Number(duration.toFixed(1)),
    capturedFrames: frames.length,
    averageCaptureFps: Number((frames.length / duration).toFixed(1)),
    medianFrameGapMs: Number((gaps[Math.floor(gaps.length / 2)] * 1000).toFixed(1)),
    outputFps: args.fps,
    sounds: Object.fromEntries(["key", "key-heavy", "mouse-down", "mouse-up", "narration"].map((kind) => [kind, events.filter((event) => event.kind === kind && event.t >= startMs).length])),
    problems,
    failed: failure?.message ?? null
  }, null, 2))

  if (args.keep) console.log(`frames kept in ${frameDir}`)
  else fs.rmSync(frameDir, { recursive: true, force: true })

  if (failure || problems.length) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
