# Storyboard schema

A film is one `storyboard.json`. `build.mjs` copies every referenced local
file into the film folder, so paths are relative to the storyboard file.
Stage size is always 1920x1080; x/y values below are stage pixels unless a
field says "normalized" (0-1 of an image). The output resolution (1080p, 2K or
4K) is chosen at render time with `render.mjs --resolution` and never changes
the storyboard.

```json
{
  "meta": { "title": "Introducing Northwind", "fps": 30, "bpm": 126 },
  "theme": { "accent": "#27aef5" },
  "brand": { "name": "Northwind", "mark": "assets/mark.png", "domain": "northwind.app" },
  "scenes": [ { "type": "sentence", "beats": 4, "...": "..." } ]
}
```

- `meta.bpm`: tempo used to turn `beats` into seconds (use the soundtrack's
  tempo; `beats.mjs` reports it).
- `theme`: optional overrides - `accent`, `accentOnDark`, `canvas`, `ink`,
  `muted`, `night`, `dot`, `font` (CSS family; Inter is bundled).
- `brand.mark`: square logo (PNG/SVG/WebP, transparent preferred). Used by
  `@mark`, the dock, stat cards and the end card. `brand.wordmark`
  (optional image) replaces the typed name on the end card.

## Timing

Every scene has `beats` (preferred) or `dur` (seconds). Times inside a scene
(`at`, `until`, camera keys) are **seconds from the scene start**. Scenes play
back to back. `in` adds an entrance transition over the previous scene:
`"fade" | "iris" | "rise" | "drop" | "push" | "zoom" | "blur"` or
`{ "type": "iris", "dur": 0.5, "origin": [0.5, 0.5] }`. Default is a hard cut.

## Text markup (sentence steps, titles, captions, headlines)

- Words split on spaces; `|` starts a new line.
- `[words]` accent color, `{words}` muted grey, `*word*` bold.
- `@mark` brand mark token, `@icon:name` Lucide icon token (accent),
  `@img:path/to/image.png` inline image token (mascot, avatar, logo).

A **sentence** is a list of steps. Each step is the full text at that moment;
words shared with the previous step stay and glide, new words arrive, missing
words leave. Step fields: `at`, `text`, `size`, `weight`, `lh`, `tracking`,
`align` (`center` | `left` | `right`), `x`, `y` (block center for center
alignment, left/right edge otherwise), `enter` (`drop` default, `rise`, `fly`,
`blur`, `slide`, `type`, `fade`, `pop`), `stagger`.
Sentence-level options: `enter`, `stagger` (0.075), `moveDur` (0.6),
`enterDur` (0.62), `exitDur` (0.3), `cps` (typewriter speed), `tone`
(`light` | `dark` - dark renders white text), `defaults` (step defaults),
`spinMark` (seconds per logo flip), `imgRadius`, `deco`, `peek`, `drift`.

Decorations (`deco`): `{ "at": 1.3, "kind": "insert" | "circle" | "underline" |
"strike" | "lift" | "color", "word": "power", "color": "accent", "until": 4 }`.

Peekers (`peek`): `{ "src": "assets/char.png" | "shape": "circle|square|
triangle|star|flower|pill|heart|blob", "color": "#f5c518", "eyes": true,
"edge": "bottom|top|left|right", "pos": 0.55, "size": 600, "depth": 0.5,
"rot": 0, "at": 0.3 }`.

## Scene types

### `sentence`
Kinetic text on `bg` (`canvas` default, `night`, `white`, a hex color, or
`{ "plate": "img.jpg" | "src": "clip.mp4", "push": [1.0, 1.06], "tint": "css
gradient" }`). Options: `steps`, `clouds` (`[{ "x", "y", "size", "at",
"drift" }]` soft 3D clouds behind the text), `peek`, `deco`, `drift` (slow
zoom amount, 0.035).

### `feature`
Icon + label card: `{ "icon": "video", "label": "Create videos" }` (Lucide
name; omit `icon` to use the brand mark). `labelAt` (0.42), `size` (80).

### `slot`
Night divider: `{ "lead": "New", "words": ["Library", "Studio", "App", "Team",
"Free"], "target": "Studio", "from": "Library" }`. Keep the same `words` list
in every divider of a film so the column feels like one machine. `size` (150),
`settle` (0.62 s), `leadColor`.

### `dock`
App-launch row: `{ "mark": "assets/mark.png", "tileIcons": [{ "icon": "mail" },
{ "src": "assets/tile.webp" }, null, ...5 entries, center is the mark],
"caption": { "steps": [...] }, "bounceAt": 0.3, "bounces": 2 }`.

### `ui`
Product screenshot or video in a frame.
- `src` (PNG/JPG/WebP/MP4), `frame`: `window` (title bar dots), `browser`
  (with `url`), `bare` (just rounded corners), `dark`, or `full` (fills the
  stage).
- Size: `width` (px at zoom 1; default fits the whole image in `fit`=0.86 of
  the frame height), `viewport` (visible height / width for tall pages; use
  with `scroll`), `radius`, `x`/`y` offsets, `bg`.
- `enter`: `rise` (default) | `zoom` | `fade` | `none`.
- `camera`: `[{ "at": 2.1, "zoom": 1.6, "focus": [0.62, 0.88], "ease":
  "glide" }]` - focus is **normalized to the full image**.
- `scroll`: `[[at, fraction, ease?], ...]` (0 top ... 1 bottom).
- `cursor`: `[{ "at", "x", "y", "click": true, "hide": true }]` normalized to
  the image.
- `typing`: `[{ "at", "rect": [x, y, w, h], "text", "size", "cps", "bg",
  "color", "pad", "padY", "radius", "wrap", "placeholder", "until" }]` - the
  box covers the field in the screenshot and types the text.
- `rings`: `[{ "at", "until", "rect": [x, y, w, h], "radius" }]` accent
  focus rings; `spot`: same fields, dims everything else.
- `swap`: `[{ "at", "src" }]` cross-fades to another screenshot state.
- `push` / `focus` for `frame: "full"`.
- `caption`: a sentence spec drawn above the frame (not zoomed).

### `plate`
Landscape photograph with glass cards: `{ "src", "push", "tint", "tone",
"title": { sentence spec }, "cards": [...] }`. A title at the top gets a
darkening gradient automatically. Card kinds (all take `at`, `x`, `y`,
`scale`, `glass`: `light` | `clear`):
- `pairs`: `{ "items": [{ "trigger": { "icon" | "img" | "mark", "text" },
  "action": {...} }], "every": 1.7, "y": 650, "gap": 70 }`.
- `stat`: `{ "title", "icon" | "mark": true, "label", "value", "from",
  "decimals", "prefix", "suffix", "note", "bars": [{ "label", "value": 0-1,
  "display" }] }` - numbers must be real.
- `list`: `{ "title", "items": [{ "icon" | "img", "text" }], "stagger" }`.
- `note`: `{ "icon", "title", "text", "w" }`.

### `phone`
Phone mockup: `{ "src" (mobile screenshot), "bg", "tone", "frame": "light" |
"dark", "phoneWidth": 860, "top": 92 | "y", "x", "enter": "rise" | "drop" |
"fade", "exitAt", "scroll", "taps": [{ "at", "x", "y" }], "status": true,
"statusBg", "screenBg", "headline": { sentence spec, left aligned } }`.

### `chat`
Large bubbles: `{ "bubbles": [{ "at", "who", "avatar", "text", "mine" }],
"size": 60, "x": 250, "anchor": 760, "maxWidth": 1300 }`.

### `burst`
`{ "pillSteps": [{ "at": 0, "text": "Meet" }, { "at": 0.45, "text": "Meet
Nova!" }], "burstAt": 1.55, "items": [{ "src" | "shape", "color", "eyes",
"fit" }], "count": 16, "itemSize": 230, "tile": true, "ball": true, "tilt": -7,
"darkAtBurst": true }`.

### `montage`
Full-bleed sequence: `{ "items": [{ "src", "beats", "origin": [x, y], "push",
"focus", "window": false }], "transition": "iris" | "fade" | "slide" | "cut",
"transitionDur": 0.5, "push": [1.0, 1.07] }`.

### `pins`
Photo with pins: `{ "src", "headline", "pins": [{ "at", "x", "y", "img" |
"icon" | "shape", "color", "label", "size" }] }` (x/y normalized to the
stage).

### `split`
Phone and window linked by pulsing dots: `{ "phone": { phone fields },
"window": { "src", "width" } }`.

### `endcard`
`{ "name", "nameSize", "markSize", "wordmark", "wordAt", "tagline",
"taglineAt", "markOnly", "peek" }`.

### `html`
Escape hatch for a custom shot: `{ "html": "<div class='x'>...</div>",
"animate": [{ "select": ".x", "props": { "x": [[0, -40], [0.8, 0, "smooth"]],
"opacity": [[0, 0], [0.4, 1]] } }] }`. Props: `x`, `y`, `scale`, `rotate`,
`opacity`, `blur`.

## Checks before rendering

- `build.mjs` warns about lines that may overflow and unknown icons; fix them.
- Run `qa.mjs` and look at every sheet: text inside the frame, UI focus on
  the right detail, cards readable on their plate, no empty frames.
