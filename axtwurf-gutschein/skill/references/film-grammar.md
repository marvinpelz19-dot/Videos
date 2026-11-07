# Film grammar

This is the style contract for every film the Skill makes. It was measured
frame by frame from a 166-second, 1920x1080, 30 fps agent-product launch film
and generalized so any product can be cut the same way. Follow the numbers;
they are what makes the result read as the same kind of film.

## 1. The feel in one paragraph

A calm, bright, confident keynote film. Large centered words appear one at a
time on a porcelain canvas, re-center as the sentence grows, and change color
from grey to ink as they land. Black "New ___" dividers roll like a slot
machine between chapters. Product UI floats as clean windows and the camera
glides into the one detail that matters, with a real cursor. Serene landscape
photographs carry frosted-glass cards. A "One more thing" beat reveals a last
surprise with a burst of characters, and the film closes on two handwritten
emphases and the logo. Everything cuts on the beat of a steady electronic
track.

## 2. Canvas and color

| Token | Value | Use |
| --- | --- | --- |
| canvas | `#f5f5f5` with a dot grid (2 px dots, 16.5 px pitch, ~10% black) | default background |
| ink | `#222222` | all settled text |
| muted | `#a9a9a9` | words that are still arriving, secondary words |
| accent | one bright hue (reference: sky blue `#27aef5`) | 1-3 payoff words per sentence, icons, dividers |
| night | `#060708` edges, `#16171a` center glow | slot dividers, cold open, "every ___ out there" beats |
| white text | `#ffffff` + soft shadow | titles on photographs and video |

Adapt to a brand by swapping **only** `accent` (and optionally `canvas` for a
brand's own off-white). Keep one accent. On dark backgrounds the engine
lightens the accent automatically so it stays legible.

## 3. Typography

One sans family (Inter is bundled; weight axis 100-900). Sizes are at the
1920x1080 stage and were measured from the reference; they are large because
the film is watched on phones. 2K and 4K renders scale the whole stage
uniformly, so these sizes hold at every output resolution.

| Element | Size | Weight | Notes |
| --- | --- | --- | --- |
| Statement (one or two lines) | 84-100 px | 460 | centered, line height 1.22 |
| Feature card label | 80 px | 460 | icon 0.9 em in accent before the label |
| Cold open / "Introducing ___" | 108 px | 500 / 600 | logo token 0.9-1.0 em |
| Hero word ("Hand", "Plan", "Ask") | 470-480 px | 460 | blurs in, then shrinks into a sentence |
| "One More Thing" | 134 px | 460 | "One" slides in at ~440 px |
| Slot divider | 150 px | 450 | row pitch 1.33 em, lead word in accent |
| Dock caption | 80 px | 460 | 170 px below the tiles |
| Photo / video headline | 96-100 px | 600 | left aligned at x=140-160, two lines |
| Chat bubble | 58-64 px | 450 | speaker label 0.72x |
| Glass card body | 44-50 px equivalent | 450 | cards are drawn at 330x168 and scaled 2x |

Tracking: -0.03 em at 200 px and above, -0.02 em at 120 px, -0.006 em for
statements, 0 below 56 px. Word spacing +0.04 em.

## 4. Motion vocabulary

All motion uses a soft "expo-out" ease (`cubic-bezier(0.22, 1, 0.36, 1)`) unless
noted. Nothing bounces except characters and the dock tile.

- **Word drop-in** (default): an arriving word starts 20% smaller, 0.34 em
  higher, muted grey and 5 px blurred; it settles in 0.6 s while its color
  goes to ink. Words already on screen glide to their new centered positions
  (FLIP) in 0.6 s. Stagger 75 ms, left to right.
- **Hero blur**: a single enormous word sharpens from 22 px blur and 1.1x in
  0.4 s, holds, then shrinks into the first word of a normal sentence.
- **Slide**: "One" enters from the right with horizontal motion blur, then
  shrinks and is joined by "More Thing".
- **Fly**: a second-line word enters from below-left at 1.3x in grey and flies
  into its slot.
- **Type**: character by character for short lines such as "Change anything, in place".
- **Slot divider**: lead word fixed on the left, a column of 5 chapter words
  on the right; the column rolls to the target in 0.62 s. Neighbors sit at
  40% and 20% opacity. 3 beats.
- **Dock launch**: five rounded tiles on a hairline shelf; the center tile
  (the product mark) bounces twice like an app launching (72 px, decaying),
  with a running-indicator dot; the caption arrives word by word underneath.
- **Feature card**: the accent icon appears alone, then the label arrives and
  the pair re-centers. Slow 4.5% push over the hold.
- **UI camera**: window rises 90 px while fading in, holds at 1.0x, then
  glides to 1.5-2.2x on the detail (input box, button, result). A macOS
  cursor moves on a smooth path; clicks dip it and ring a ripple. Text types
  into fields at ~30 characters per second.
- **Plate + glass**: a landscape photograph pushes 1.03 -> 1.10 over the
  shot. Frosted cards rise 36 px in. Trigger -> action pairs cycle every
  ~1.7 s; the old pair sinks into a stack behind the new one.
- **Burst**: a white pill grows word by word ("Meet" -> "Meet ___!"), tilts,
  then characters or tiles spring out around it and the pill turns dark.
- **Hand-drawn emphasis**: *insert* lifts a word above the line with a
  squiggle (proofreader's insertion), *circle* rings a word with an
  overshooting pen stroke, *strike* crosses a word out, *underline* waves.
- **Peek**: on closing scenes, large characters or tiles slide in from the
  frame edges and bob slightly.
- **End card**: a dot grows into the mark, the wordmark wipes in from the left
  and its color settles from accent to ink.
- **Cuts**: almost all transitions are hard cuts on a beat. Use iris wipes
  only inside showcase montages; use `rise` for a panel that slides up.

## 5. Rhythm

- The soundtrack is a steady 120-130 BPM electronic instrumental. Cut on
  beats (`build.mjs --beats` snaps every scene boundary to the analysed grid).
- Typical lengths in beats: slot 3, statement 3-6, feature card 4, UI shot
  10-18, plate with cards 8-13, burst 8, closing statements 8, end card 12.
- Place "One More Thing" on a musical dip and the burst where the energy
  returns.
- 75-120 s is the sweet spot for a single product; the reference ran 166 s
  with six feature chapters.

## 6. Structure (beat sheet)

1. **Cold open** (4 beats, night): spinning logo token, then product name
   (and version if there is one).
2. **Introducing** (3 beats, canvas): "@mark Introducing Product".
3. **Hero word** (5 beats): "Hand" / "Plan" / "Ask" at 470 px -> sentence
   with the accent on the promise.
4. **Chapters** (3-5): each opens with a slot divider "New ___" (or another
   one-word lead such as "Your ___") and then uses 2-5 of: statement, feature
   card, UI shot, plate + glass card, cloud statement, montage, chat, phone,
   dock, photo/video headline.
5. **One More Thing** (6 beats) -> slot -> **burst** "Meet ___!" -> 2-4 shots
   about the surprise (phone, video headline, pins on a street photo, list).
6. **Close**: "Product gives you ___" with an insert on the key word, a
   short line that hands the choice to the viewer ("You choose what ships")
   with a circle on "You", then the **end card** with characters peeking in.

## 7. Content rules

- Every claim, number, UI label and feature comes from the product's own site
  or material. Never invent metrics; a stat card must show real numbers.
- Prefer the product's real UI (captured screenshots) over mockups.
- Characters: use the product's own mascots, avatars, icons or illustration
  tiles. Without them, use plain geometric shapes (optionally with simple dot
  eyes). Never borrow another product's characters or logo.
- Lifestyle b-roll must not show readable fake interfaces or third-party
  logos.
- Copy is English by default (see `copywriting.md`).
