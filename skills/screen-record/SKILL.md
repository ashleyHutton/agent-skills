---
name: screen-record
description: Record a scripted browser demo of a feature to MP4, with a visible cursor, click ripples, keystrokes, and captions. Use when the user asks for a screen recording, demo video, or walkthrough of a change, or wants video QA evidence for a PR.
---

# Screen Record

`rec.mjs` plays a script you write in a real headless browser and saves it as an MP4. The input is real mouse and keyboard events, so a broken click fails the run. `expectText` steps fail it too, so a recording that finishes has also checked what it shows.

## Setup

Run once in this skill's directory:

```bash
npm ci || npm install
```

It needs a current Chrome. It uses `executablePath` from `~/.agent-browser/config.json`, or set `REC_CHROME`.

## Workflow

1. Get the app running and find out what data the flow needs. Recording changes data, so use a dev database, and re-seed between attempts.
2. Write a demo script outside the repo (thread storage is a good place), based on `example-demo.mjs`. Plan one short story, about 30 seconds.
3. Record:

   ```bash
   node <skill-dir>/rec.mjs demo.mjs -o demo.mp4 --base http://localhost:3000
   ```

   Options: `--size 1280x800`, `--scale 2`, `--fps 60`, `--keep-frames`.

4. **Check the video before sharing it.** A passing run doesn't mean it looks right. Build a contact sheet with the bundled ffmpeg and read the image:

   ```bash
   FFMPEG=<skill-dir>/node_modules/ffmpeg-static/ffmpeg
   "$FFMPEG" -y -loglevel error -i demo.mp4 -vf "fps=1/2.5,scale=640:-1,tile=3x4:padding=4" -frames:v 1 sheet.png
   ```

   Look for: captions out of step with the page, an error page, the cursor hidden by a modal, and anything sensitive on screen. Pull a single full-size frame with `-ss <seconds> -frames:v 1` to check sharpness.

5. Read the JSON summary, and report `problems`, `failed`, and `averageCaptureFps` honestly.

## Script API

Export `run(r)` and optionally `setup(r)`, which isn't recorded. A target is a CSS selector or a Playwright locator from `r.page`. Prefer roles and scoped locators such as `r.page.getByRole("button", { name: "Save" })`.

| Method | What it does |
|---|---|
| `r.goto(path)` | Navigates, and fails on an error status |
| `r.click(target)` | Glides to the target and clicks, with a ripple |
| `r.hover(target)` | Glides to the target and rests |
| `r.type(target, text, { clear, delay })` | Clicks, then types key by key. `clear` empties the field first |
| `r.press(key)` | Presses one key, such as `"Enter"` |
| `r.select(target, label)` | Chooses a native `<select>` option |
| `r.scroll(deltaY)` | Scrolls smoothly with the mouse wheel |
| `r.caption(text)` | Shows a caption at the bottom right. `""` clears it |
| `r.pause(ms)` | Holds, so the viewer can read |
| `r.settle()` | Waits for the network to go quiet |
| `r.expectText(text, scope)` | Fails the run unless the text is visible |
| `r.expectNoText(text, scope)` | Fails the run if the text is present |
| `r.page` | The Playwright page, for anything else |

Set a caption after a navigation finishes, or it shows over the previous page.

## Sharing

For a GitHub PR, upload with `gh pr edit <number> --repo <owner>/<repo> --body-file <body.md> --attach './demo.mp4'`. `gh` rejects alt text on video, so leave off the `#alt` suffix. Reference it in the body as `![Demo](./demo.mp4)`, and `gh` replaces that with an embedded player URL. Read the PR back to confirm. Don't commit recordings to the repo.

## Notes

- **Exit code:** it exits non-zero on a failed step, a page error, or a 5xx, but still writes the video if it captured frames. Look into `problems` rather than dismissing them.
- **Frame rate:** the file is constant 60 fps, but Chrome only sends a frame when the page changes, and frames arrive less often at `--scale 2`. Motion looks smooth without being true 60. Use `--scale 1` for more captured frames and softer text.
- **2x capture:** this uses Chrome's `--force-device-scale-factor` with no viewport override. Playwright's `deviceScaleFactor` doesn't affect screencast frames.
- **Window height:** the window is 87px taller than the requested page to allow for headless Chrome's window. The run prints the actual page size, so check it says what you asked for.
- **Overlay:** it's a top-layer popover outside `<body>`, so it survives Turbo visits and stays above dialogs and popovers. It also hides rack-mini-profiler's badge.
- **Native `<select>`:** headless Chrome doesn't paint the popup, so `r.select` sets the value and shows the choice in the key display.
