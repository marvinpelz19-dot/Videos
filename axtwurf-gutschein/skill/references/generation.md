# Generated media (optional, paid)

The style leans on three kinds of media the product rarely has:

1. **Landscape plates** - serene, bright nature photographs used behind glass
   cards, titles and phones (salt flats, glacier cliffs, waterfall canyons,
   limestone stacks in turquoise water, dunes meeting the sea, a lone tree in
   a salt lake, soft cumulus skies, alpine lakes, a quiet shop street).
2. **Live-action b-roll** - 5 s cinematic moments that show the product's
   benefit in real life (a desk working at night, someone reading a phone
   notification and smiling, cooking while a phone lights up).
3. **Soundtrack** - a steady 120-130 BPM instrumental with a quiet intro, a
   mid-film dip and a final lift.

All three run through FAL with `FAL_KEY`. Plan them in `media.json`, show the
user the list and the expected cost, and submit only after they agree.

```json
{ "jobs": [
  { "id": "plate-salt-flat", "kind": "plate",
    "prompt": "A vast white salt flat with a thin turquoise channel meandering to distant hazy blue mountains, pale clear sky." },
  { "id": "clip-desk-night", "kind": "clip", "duration": 5,
    "prompt": "A calm modern office at night; on an empty desk a monitor glows and windows move by themselves; city lights; slow push in." },
  { "id": "soundtrack", "kind": "music", "seconds": 118,
    "prompt": "Minimal, confident electronic instrumental for a product launch film, steady 126 BPM, crisp plucked synth arpeggios, round sub bass, tight four-on-the-floor kick with soft claps, airy pads. Sparse 6-second intro, full groove, a short breakdown near the middle, a final lift and a clean ending. No vocals." }
] }
```

```bash
node <skill>/scripts/generate.mjs --jobs media.json --out assets/generated --resolution 1080p --dry-run   # review
node <skill>/scripts/generate.mjs --jobs media.json --out assets/generated --resolution 1080p             # pay and download
node <skill>/scripts/beats.mjs assets/generated/soundtrack.mp3 --out assets/generated/beats.json --bpm 126
```

| kind | default model | output |
| --- | --- | --- |
| plate | `openai/gpt-image-2.5/flare/text-to-image`, quality high, 2560x1440 JPEG (3840x2160 with `--resolution 2k` or `4k`) | `<id>.jpg` |
| clip | `bytedance/seedance-2.5/text-to-video`, 1080p, 16:9, no audio | `<id>.mp4` |
| music | `elevenlabs/music/v2.5`, instrumental, MP3 48 kHz | `<id>.mp3` |

Pass the film's resolution to `--resolution` (default `1080p`). GPT Image 2.5
renders plates up to 3840x2160, so 2K and 4K films get plates at full
resolution. A custom `"size": { "width", "height" }` must use multiples of 16,
a long edge of at most 3840 px and 655,360-8,294,400 pixels; the script checks
every job before it submits anything. Seedance 2.5 tops out at 1080p, so in a
2K or 4K film the b-roll is scaled up; that suits soft b-roll but not hero
detail. For a crisp 4K master, use the product's own high-resolution footage
where detail matters.

Override with `"model"` per job only when the user asks for a different
provider model; keep the same input fields or pass `"raw": true` with a
complete prompt. For plates, `openai/gpt-image-2.5/sunburst/text-to-image`
takes the same inputs and adds finer detail at a higher price; `"quality"`
(`medium`, `high`, `xhigh`, `max`) trades cost for detail.

Rules:

- `assets/generated/tasks.json` records every request id. Re-running resumes
  polling and downloading; it never pays twice for the same id and input.
- A failed job is not retried automatically. Report it; resubmit only after
  the user agrees (`--resubmit-failed`).
- Plate and clip prompts get a shared style suffix (bright, calm, no people
  for plates, no readable text or logos). Keep people out of plates; for clips
  keep screens soft and unreadable.
- Music: ask for the film length plus 5-10 s, then snap scene cuts to the
  analysed beat grid (`build.mjs --beats`). Mix the music so it ends with a
  2-3 s fade (`render.mjs --audio-fade 2.5`).
- Without `FAL_KEY` the film still works: use the product's own photography,
  a plain `canvas`/`night` background for plate scenes, and a licensed track
  supplied by the user.
