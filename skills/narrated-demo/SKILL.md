---
name: narrated-demo
description: Produce a narrated, presentation-style demo video of a feature, with intro and outro title cards and a voice-over script timed to each scene, built on top of screen-record. Use when the user asks for a narrated demo, a video with an intro or outro, a voice-over, or something to show off a feature rather than plain QA evidence.
---

# Narrated Demo

This adds post-production to `screen-record`. The narration is a script written for the scenes and sized to fit them, rather than the captions read aloud. The video opens and closes on title cards with their own lines.

The pipeline is:

1. Record the demo with `screen-record`, marking key moments as it runs.
2. Measure how long each scene lasts.
3. Write a script with a word count that fits each scene, plus an intro and an outro.
4. Generate the speech and check every line fits. Trim or re-record until it does.
5. Render the title cards and mix everything into the final video.

For a silent walkthrough or plain QA evidence, use `screen-record` alone.

## Setup

This skill has no dependencies of its own. It uses the sibling `screen-record` skill's capture, speech model, ffmpeg and Playwright. Read `../screen-record/SKILL.md` first, and complete its setup, including the narration step:

```bash
cd ~/.claude/skills/screen-record && (npm ci || npm install) && npm install --no-save kokoro-js
```

Set `S=~/.claude/skills/narrated-demo` for the commands below. Keep all working files in one directory outside the repo (thread storage is a good place), and run each command from it.

## 1. Record with marks

Write the demo script as the `screen-record` skill describes, then add marks:

```js
import { mark, saveMarks } from "/home/<you>/.claude/skills/narrated-demo/marks.mjs"

export async function run(r) {
  mark("start")                 // must be the first line of run()
  await r.caption("Open a report")
  // ...
  await r.expectText("Export ready")
  mark("exported")              // after the assertion, when the moment is on screen
  // ...
  mark("end")
  saveMarks("marks.json")
}
```

- **Placing marks:** put `mark("start")` first, so mark times line up with the video. Place each mark after the action or assertion that puts that moment on screen, not before it.
- **Captions:** keep them short. They're on-screen titles; the narration explains.
- **Recording:** record with sound but without `--narrate`, so the typing and click sounds stay in the base video:

```bash
node ~/.claude/skills/screen-record/rec.mjs demo.mjs -o base.mp4 --base http://localhost:3000
```

Check the JSON summary as `screen-record` describes. A run should exit 0 with no `problems`.

## 2. Write the script

Copy `$S/example-script.json` to `script.json`. Every scene runs from one mark (`at`) to the next (`until`).

Plan with these rules:

- **Word budget:** about **2.2 words per second** of scene for `bm_george` at speed 0.95. Always measure in step 3 rather than trusting the estimate.
- **Don't read the captions:** say why the moment matters, in a different way from the caption.
- **Intro:** open with something like "Hey everyone, we are excited to introduce…". Keep it to about 15–20 words.
- **Outro:** give the before and after in a sentence or two, then "Thanks for watching!". Keep it to about 15–20 words.
- **Spelling:** write anything that should be spelled aloud with spaces, such as "My V C R M" for MyVCRM.
- **Scene lengths:** short scenes, under about 3 seconds, rarely fit a full sentence. Merge them by pointing one line from the first mark to a later `until`.
- **Accuracy:** the narration must be true. Don't describe anything the video doesn't show.
- **Cards:** the `cards` text appears on the title cards and should agree with what the intro and outro lines say.

## 3. Fit the narration

```bash
node $S/narrate.mjs .
```

This generates `clips/*.wav` and prints each line's word count, speech length and scene length. Any line marked `OVER` runs into the next scene. It exits 1 until every line fits.

To fix a line that's over, choose one:

- Trim the line, then run it again. This is usually best.
- Add `r.pause()` in that scene of `demo.mjs`, then re-record and run it again.

A line with lots of spare words leaves a silence. That's fine during a pause on a result, but not during a long stretch of action.

## 4. Build the video

```bash
node $S/cards.mjs .
node $S/build.mjs . -o demo.mp4
```

`cards.mjs` renders `intro.png` and `outro.png` at the base video's size. `build.mjs` does the following:

- Joins the intro card, the demo and the outro card, with fades.
- Starts each line 0.15s after its mark.
- Lowers the typing and click sounds while the voice plays.
- Refuses to build if any two lines overlap.
- Prints the silences it detects, the peak level and the path to a contact sheet.

## 5. Check before sharing

- **Contact sheet:** read `sheet.png`. Look for an error page, captions out of step with the page, the cursor hidden behind a modal, or anything sensitive on screen.
- **Single frames:** pull a frame at a key moment to check what's on screen when a line plays:

  ```bash
  ~/.claude/skills/screen-record/node_modules/ffmpeg-static/ffmpeg -y -loglevel error -ss 23 -i demo.mp4 -frames:v 1 frame.png
  ```

- **Silences:** the `silences` ranges should fall between scheduled lines. A missing gap means two lines run together.
- **Peak level:** `peakDb` should be below 0.
- **Audio:** you can't hear the result, so say so, and ask the user to listen before sharing.

## Sharing

Attach the video to a PR as `screen-record` describes. Keep it out of the repository. A narrated video is usually 4–6 MB for under a minute at the default `--scale 2`.

## Gotchas

- **Embedded frames:** `screen-record`'s overlay also runs inside iframes. On pages with a YouTube embed this causes `TrustedHTML` or `sessionStorage` page errors, and the recorder exits 1, even though the app is fine. If the embed isn't part of the demo, serve a blank page in `setup` instead:

  ```js
  await r.page.context().route("**/www.youtube.com/**", (route) => route.fulfill({ contentType: "text/html", body: "" }))
  ```

  Don't use `route.abort()`. It leaves a Chrome error page in the frame, which raises errors of its own.
- **Machine load:** a busy machine slows the whole run, and the same script can take half as long again. Check `uptime`, and re-record if the scenes come out much longer than planned, because the script was sized to the earlier timings.
- **Re-recording:** re-seed the data before each take. Every take needs a new `narrate.mjs` run, because the marks move.
- **Typed keys over captions:** the keys display can briefly cover the caption during long typing. Add `r.pause(1500)` before a caption that follows typing, so the keys fade first.
