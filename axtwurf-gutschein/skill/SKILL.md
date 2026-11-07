---
name: bs-manus2-0-style-launch-video
description: "Turn a product name or website URL into a Manus 2.0 style launch video: a 75-120 second film with kinetic type on a porcelain canvas, New-word slot dividers, the product's real interface with camera push-ins, glass cards on landscape plates and a One More Thing reveal, all cut to a beat-synced soundtrack. The Skill researches the site in a browser, writes a storyboard from the product's own facts and delivers an editable film plus an MP4 in 1080p, 2K or 4K. Use it for launch videos, product announcements, feature recaps and keynote-style promos."
model: claude-opus-5-5
---

# Manus 2.0 Style Launch Video

Make a launch film for any product in the style of the Manus 2.0 launch
video: calm, bright and confident, with the product's own interface and words
carrying the story. This is an independent style study; it is not affiliated
with or endorsed by Manus, and it never uses that film's footage, music,
characters or logo.

## Model: Claude Opus 5.5 only

This Skill is pinned to **Claude Opus 5.5** (`claude-opus-5-5`). The `model`
field in the frontmatter makes Claude Code run every invocation on that
model; do not override it. Research, copywriting and storyboard decisions are
tuned for Opus 5.5 and decide how good the film is. If the host cannot pin
the model this way and the session is not running Claude Opus 5.5, stop and
ask the user to switch to Claude Opus 5.5 before continuing. Never fall back
to another model.

## What you deliver

- `film/` - an editable, previewable HTML film (storyboard + engine + assets).
- `film.mp4` - 30 fps, H.264 High, AAC soundtrack, cuts on the beat, in the
  resolution the user picks: **1080p** (1920x1080, default), **2K**
  (2560x1440) or **4K** (3840x2160).
- A short report: sources used, generated media and their request ids,
  duration, and anything the user should verify.

## Requirements

- Node.js 20+, FFmpeg on PATH.
- `npm install playwright-core` in the film project folder, plus Google
  Chrome (preferred) or `npx playwright install chromium`.
- Optional: `FAL_KEY` for generated media, billed by FAL (see
  `references/generation.md`): landscape plates behind titles and glass cards
  with **GPT Image 2.5**, 5-second live-action b-roll with **Seedance 2.5**, and
  the instrumental soundtrack with **ElevenLabs Music**. Without it, use the
  product's own imagery and a licensed track.

Run the scripts with the project folder as the working directory (that is
where Playwright is resolved), e.g.
`cd <project> && node <skill>/scripts/capture.mjs --url ... --out capture`.
Set `FILM_NODE_MODULES=/path/to/node_modules` to reuse another install, and
`FILM_CHROME_PATH` to point at a specific Chrome binary.

## Workflow

1. **Set up** a project folder (`<project>/`), install `playwright-core`
   there, and confirm the product URL, film length (default 90-110 s),
   language (default English), output resolution (1080p by default; offer
   2K and 4K) and whether paid generation is allowed. If the
   user only gives a product name, find the official site with web search and
   confirm it before capturing.
2. **Research the product** - follow `references/research.md`. Run
   `scripts/capture.mjs`, read `site.json` and every screenshot, and dump the
   page text with your browser when copy is animated or hidden. Decide the
   promise, 3-5 pillars, proof for each pillar, the "one more thing", the
   characters and the accent color. Use only facts from the product's own
   material.
3. **Plan the film** - map the story onto the beat sheet in
   `references/film-grammar.md` and write the lines with
   `references/copywriting.md`. Give each pillar a one-word divider noun and
   keep one list of divider words for the whole film.
4. **Collect assets** - `scripts/shoot.mjs` for crisp 2x/3x UI elements,
   phone views and cards; logo mark (square, transparent), a light variant
   for dark scenes, characters or icon tiles, larger preview images. For a
   2K or 4K film capture with `--scale 3` (`capture.mjs` and `shoot.mjs`)
   and prefer SVG marks, so push-ins stay sharp at the larger size.
5. **Generated media (optional, paid)** - write `media.json` (plates,
   clips, soundtrack), show the user what will be generated and the cost, run
   `scripts/generate.mjs --resolution <film resolution>` after approval, then
   `scripts/beats.mjs <soundtrack> --out beats.json` to get the tempo and beat
   grid. Without generation, use the product's own imagery and a track the
   user supplies (still run `beats.mjs` on it).
6. **Write `storyboard.json`** - schema in `references/storyboard-schema.md`,
   a complete example in `references/example-storyboard.json`. Set
   `meta.bpm` to the soundtrack tempo and give scenes `beats`.
7. **Build, preview and fix**

   ```bash
   cd <project>
   node <skill>/scripts/build.mjs --storyboard storyboard.json --out film --beats beats.json
   node <skill>/scripts/qa.mjs film --out qa --per-scene 3
   node <skill>/scripts/serve.mjs film      # optional live preview with a scrubber
   ```

   Look at every QA sheet. Fix overflow, weak contrast on plates, UI camera
   focus on the wrong detail, cards that are empty or cut, and timing that
   feels rushed; rebuild and re-check the scenes you changed
   (`qa.mjs --scenes 4,5` or `--times 12.5,30`).
8. **Render** at the chosen resolution (`1080p` default, `2k` or `4k`):

   ```bash
   node <skill>/scripts/render.mjs film --out film.mp4 --resolution 1080p \
        --workers 6 --audio assets/generated/soundtrack.mp3 --audio-fade 2.5
   ```

   The stage is always composed at 1920x1080; 2K and 4K render the same
   frames at a higher pixel density, so every size and position in the
   storyboard stays valid. Rendering is deterministic (frame by frame); with
   6 workers a 100-second film takes a few minutes at 1080p, 2K about 1.2x
   as long and 4K about 2x, and a 4K file is about 3-4x the size of 1080p.
   Check a short range first with `--from` and `--to` before a long 4K
   render. `--png` captures lossless frames but is 5-10x slower.
9. **Verify and deliver** - `ffprobe` the MP4 (the chosen resolution,
   30 fps, audio present, expected duration), extract a 1 fps contact sheet,
   review it once more, then send the MP4 and the report.

## Quality bar

- Type sizes, colors and motion follow `film-grammar.md`; large centered
  words, one accent, hard cuts on beats.
- Every product claim and UI label is real and current; no invented metrics.
- UI shots are sharp at their maximum zoom (capture at 2x for 1080p, 3x for
  2K and 4K).
- Generate plates at the film's resolution: GPT Image 2.5 makes 2560x1440
  plates for 1080p and 3840x2160 for 2K and 4K (`generate.mjs --resolution`).
  Seedance b-roll tops out at 1080p and is scaled up in 2K and 4K; use the
  product's own high-resolution footage where a 4K master needs detail.
- Text on photographs and video has a darkening gradient and passes a quick
  squint test; nothing important sits on a bright patch.
- The "One More Thing" beat lands on a musical dip; the end card holds for at
  least 3 s.
- No emoji or dingbats as icons (the engine uses Lucide line icons), no
  third-party logos except where the product itself shows integrations.

## Rights and limits

- Use material the user owns or may use to promote the product. For
  third-party products, label the result a concept edit built from public
  pages.
- The engine renders silent visuals; the soundtrack is generated or supplied.
  There is no voiceover.
- Chrome renders `backdrop-filter`, blurs and video frames in the headless
  capture; very heavy scenes simply render slower.
