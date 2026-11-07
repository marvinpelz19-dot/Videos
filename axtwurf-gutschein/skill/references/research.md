# Researching the product

The film is only as good as the material gathered here. Spend real effort:
read the site like a product marketer, then collect crisp assets.

## 1. Capture the site

```bash
node <skill>/scripts/capture.mjs --url https://product.example --out capture \
     --pages /features,/pricing --max-shots 10
```

- Writes `capture/site.json` (title, description, headings with the text under
  them, calls to action, navigation, logo candidates, colors, fonts, media,
  video sources) and `capture/shots/` (2x desktop sections, full page, 3x
  mobile sections) plus `capture/media/` (logos, large images, posters).
- If the status is 403/429 or the title looks like a bot check, rerun with
  `--headed` (a visible Chrome window opens briefly). If it still fails, use
  your own browser tools to read the page and take screenshots.
- Cookie and consent banners are hidden, never accepted.

Read `site.json` headings in order, then open the screenshots. For long
marketing pages also dump the visible text with your browser tool: rotating
headlines, card copy and FAQ answers are the best source lines.

## 2. Decide the story

Write down, from the site only:

- Product name, one-line promise, version (if any), primary color.
- 3-5 pillars (these become the "New ___" dividers). One noun each.
- For each pillar: the proof you can show (UI, card, number, example task).
- The "one more thing": the most surprising item (new app, platform,
  free tier, new model...).
- Characters: mascots, avatars, illustration tiles, 3D objects, app icons.

## 3. Collect film-grade assets

- **UI shots**: capture the exact element at 2x so zooms stay sharp (3x with
  `--scale 3` when the film will be rendered in 2K or 4K).

  ```bash
  node <skill>/scripts/shoot.mjs --url https://product.example --out assets/app.png \
       --clip 230,480,980,670            # document coordinates in CSS px
  node <skill>/scripts/shoot.mjs --url ... --out assets/card.png --selector ".pricing .card"
  node <skill>/scripts/shoot.mjs --url ... --out assets/phone.png --mobile --clip 0,0,390,844
  ```

  Read coordinates off `capture/shots/desktop-full.jpg` (1 px = 1/scale CSS
  px: 0.5 at the default `--scale 2`).
  Trim white margins (the engine draws its own frame and shadow) and set the
  frame `radius` to the element's corner radius.
- **Animated mockups** on marketing pages settle after a few seconds; use
  `--wait 5000` or a larger value, and re-shoot if a panel is empty.
- **Vector marks**: inline SVG logos and avatars can be exported with styles
  inlined (evaluate `getComputedStyle` per node and write it back as a
  `style` attribute) and rendered at 512 px for crisp characters.
- **Cut-outs**: for 3D objects on a gradient, crop each object and remove the
  background with any local matting tool; keep PNG alpha.
- **Larger preview images**: CDN image URLs often accept a size or variant
  parameter; remove card-size variants to get the full image.
- **Brand color**: sample it from the primary button or logo, not from CSS
  variables alone.

## 4. Rights

Use material the user owns or is allowed to use for promoting the product
(their own site, press kit, or assets they supply). For third-party products,
tell the user the film is a concept edit built from public pages and should
not be published as official material without permission.
