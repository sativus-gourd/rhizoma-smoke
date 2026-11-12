# Using the growth: on a website, in After Effects, on video and as stills

Pick the form that fits the work:

| You want | Use | Moves like the site |
|---|---|---|
| A heading, a section or a whole screen that grows on a web page | The embed, `docs/embed/sg-rhizoma.js` or `.mjs` | Yes: the same engine, every root on its own clock |
| Text set in the fonts, on the web | The web fonts, `docs/webfonts/` | The variable fonts grow on their Growth axis |
| Moving type in After Effects | The variable fonts, from Download on the site | On the Growth axis, keyframed |
| Frames or a clip for any editor | Record in the SG Rhizoma Engine on the site | Yes: exactly as it plays on screen |
| A still, a print, a mask | SVG from the SG Rhizoma Engine | The finished growth |

The engine grows each root on a clock of its own: the thick roots first, a branch when its parent's tip reaches it, and every letter differently. A font carries one growth for each of a character's three looks, and its Growth axis lengthens every root at once, from the bare letter at 0 to the full growth at 100. For the engine's motion, use the embed or a recording; for type you can set, edit and animate letter by letter, use the fonts.

---

## 1. On a website: the embed

The live engine in one script or one module. A heading keeps its text for screen readers, search and copying; the growth is drawn over it.

### 1.1 A heading

```html
<script src="https://sativus-gourd.github.io/rhizoma-smoke/embed/sg-rhizoma.js" defer></script>

<h1 data-sg-rhizoma="roses" data-seed="202">Roses</h1>
```

The heading grows once, when a fifth of it comes into view.

| Attribute | Does | Default |
|---|---|---|
| `data-sg-rhizoma` | the face: `smoke`, `roses`, `v2`, `drag`, `flame` or `tangle` | `smoke` |
| `data-seed` | the seed; the same seed grows the same shape every time | the face's font seed |
| `data-growth` | `10`, or a rise or fall through the text such as `2-18`, from 0 to 20 | `10` |
| `data-colour` | the ink | the heading's colour |
| `data-scale` | the grown word's size against the heading's | `1` |
| `data-weight` | the line weight: `0.5` to `2`, or `fine`, `earthy` or `heavy` | `earthy`: the face's own |
| `data-replay` | a click grows it again | off |
| `data-field` | fill the element with the grown word (section 1.2) | off |
| `data-fixed` | with `field`: the element is the screen | off |
| `data-size` | with `field`: the word's share of the width, 0 to 1 | `0.5`, and `0.8` below 640 px |
| `data-climb` | rise to this growth, 0 to 20, once drawn (section 1.3) | none |
| `data-seconds` | how long the climb takes | `40` |
| `data-pace` | the speed of the growth, 1 as tuned | `1` |
| `data-dpr` | the highest pixel ratio drawn | `2` |
| `data-autoplay` | `false` draws nothing until you call `replay()`, `setGrowth()` or `climb()` | on |

**Finding a seed.** Grow your text in the engine on the site until you have a growth you want to keep, then press Copy embed code: it carries the face, seed, growth, weight and colours. The same text, face, growth and seed grow the same shape anywhere.

**Line weight.** Root width is a multiplier. Each face grows at the weight that suits it: SG Smoke 1.5, SG Roses 1.25, the others 1, with `fine` and `heavy` as its lighter and heavier presets. The weight changes only the width, so a seed grows the same shape at any weight. At high growth SG Smoke eases its own weight down, to 1.3 from growth 18, so its roots do not fill the letters. Growths made with a beta before v19.17 were drawn at 1, and `data-weight="1"` matches them.

**Room.** Roots reach past the text. Give a heading padding, about half its font size above and below at growth 10, and more for SG Roses and SG Rhizoma V2 above 15. A field (section 1.2) clips at its own edge instead.

**From a script.** `SGRhizoma.grow(element, options)` grows at once and returns a controller. The options are the attributes without `data-`, plus `text` for a text other than the element's own.

```html
<script>
  addEventListener('DOMContentLoaded', () => {
    const h = document.querySelector('#title');
    const g = SGRhizoma.grow(h, { face: 'roses', seed: 202, growth: '12' });
    h.addEventListener('mouseenter', () => g.replay());   // grows again on every hover
  });
</script>
```

The controller: `ready` (a promise, true at the first frame), `replay({ seconds })`, `setGrowth(n)`, `climb(n, { seconds })`, `release({ seconds })`, `snapshot({ type })`, `setWeight(w)`, `setColour(c)`, `redraw()`, `stop()`, `remove()`, and `growth`, `state` and `element` to read. A method that takes time returns a promise: true when it finishes, false when something replaced it.

**On a phone.** Growth 10 is light. At growth 20, SG Roses and SG Rhizoma V2 grow over a thousand roots and play at 15 to 20 frames a second at a quarter of desktop speed, our stand-in for a mid-range phone: keep them for one hero word, and try them on your visitors' phones. Reduced motion shows the finished growth at once.

### 1.2 A field: a section or the whole screen

```html
<script src="https://sativus-gourd.github.io/rhizoma-smoke/embed/sg-rhizoma.js" defer></script>

<sg-rhizoma face="roses" seed="202" field climb="20" seconds="40"
            style="display:block; height:100vh; background:#0A0807; color:#EBE6D7; font-size:56px">Roses</sg-rhizoma>
```

The canvas fills the element edge to edge. The word sits in the middle at half the element's width (four fifths below 640 px), and the roots run out past the edges, where the element clips them. SG Roses at growth 20 reaches about two words' width on each side of the word, enough to fill a screen.

- The element's background is the ground; its text colour is the ink.
- `fixed` makes the canvas the screen itself, whatever the element's size. Use it for an entry.
- The pixel ratio is capped at 2 (`dpr`) and drops to 1.5 when frames run slow, so the growth keeps its pace and the roots stay sharp.
- A resize refits the growth without growing it again. Painting stops while the element is off screen.

### 1.3 Continue a growth

`setGrowth(14)` takes the growth on screen to 14. `climb(20, { seconds: 40 })` takes it to 20 over 40 seconds, every tip at one steady speed. With nothing drawn yet, `climb` grows the word from nothing to that growth, which is what an entry should use: nothing is drawn twice, and every root keeps the width it starts with. With a `growth` as well, the word grows to that first and climbs on from it.

**The speed.** The seconds are shared evenly over the growth's steps: SG Roses to 20 in 40 seconds moves its tips about 44 px a second at a word 640 px wide. The site's own headings grow four to eight times as fast.

At a higher growth, SG Smoke, SG Roses, SG Drag, SG Flame and SG Tangle keep every root they had and add more, so the roots on screen stay and grow on, and the last frame is the growth you would get from nothing. A root that carries on is drawn at the width of its longer reach, so roots already drawn swell as their tips run on; the first growth of an entry does not. SG Rhizoma V2, a lower growth, and any growth after `release()` play whole.

A growth is built on the page's thread before its first frame. On a 390 px phone screen at pixel ratio 3, climbing to 18 over 20 seconds:

| Face | First frame, full speed | First frame, a quarter of desktop speed | Frames at a quarter of desktop speed (median, slowest 5%) |
|---|---|---|---|
| SG Smoke | 56 ms | 0.2 s | 50 ms, 100 ms |
| SG Roses | 250 ms | 0.6 s | 67 ms, 100 ms |
| SG Flame | 140 ms | 0.45 s | 50 ms, 67 ms |
| SG Rhizoma V2 | 100 ms | 0.26 s | 17 ms, 50 ms |
| SG Drag | 0.8 s | 2.3 s | 50 ms, 83 ms |
| SG Tangle | 1.4 s | 13.5 s | 33 ms, 83 ms |

At full speed every face holds 60 frames a second. For a climb on a phone, choose SG Smoke, SG Roses, SG Flame or SG Rhizoma V2; SG Tangle to 18 is for a desktop.

### 1.4 Events, release and snapshot

Events fire on the element and bubble, so one listener on `document` hears every element.

| Event | When | `detail` |
|---|---|---|
| `sg:ready` | the first frame is drawn, and the heading text is hidden | `{ growth, face }` |
| `sg:level` | a growth is reached (once, at the end, for a climb from nothing) | `{ growth, roots }` |
| `sg:settled` | nothing is left to play: once at the end of a climb | `{ growth }` |
| `sg:released` | `release()` has withdrawn the roots | `{ growth }` |
| `sg:error` | the fonts, the build or the drawing failed, and the heading is back | `{ stage, error }` |

**`release({ seconds })`** withdraws the roots, the last grown first, and leaves the word, in 1.1 seconds unless you say otherwise. Where drawing backwards is too heavy for the device, the canvas fades out in the same time. Reduced motion cuts at once.

**`snapshot()`** returns the finished growth as a PNG `Blob`, transparent unless you pass `{ background: true }`, or as an SVG string with `{ type: 'svg' }`. For stills, grow an element with `autoplay: false`, take the snapshot and remove the element.

**Fail-soft.** The heading text shows until the first frame is drawn. If the fonts, the build or a frame fail, the canvas goes, the heading is as it was, `sg:error` fires and `ready` resolves to false. The script makes no request to a third party: opentype.js 1.3.4 (MIT) is bundled in it, and the fonts load from beside the script (or from your site's `/fonts/`, section 1.5).

### 1.5 In your stack

The embed loads in three ways:

- **A script tag**, for a plain page, WordPress, Webflow, Squarespace, Shopify or any other that takes a script and some HTML: in the head with `defer`, at the end of the body, with `async`, or after the page has loaded. Use `data-sg-rhizoma` or `<sg-rhizoma>`.
- **A module**, `docs/embed/sg-rhizoma.mjs`: `import SGRhizoma, { grow } from './sg-rhizoma.mjs'`. On a server every call does nothing and returns an inert controller, so a server-rendered component may import it. Grow in the browser: in an effect, `onMounted`, an action or a script.
- **The element** `<sg-rhizoma>`: attributes in (`face`, `seed`, `growth`, `colour`, `ground`, `scale`, `weight`, `text`, `field`, `fixed`, `size`, `dpr`, `pace`, `climb`, `seconds`, `replay`, `autoplay`), events out, methods on the element (`el.climb(20)`, `el.release()`, `el.snapshot()`, `el.ready`). Set `growth`, `weight` or `colour` and the word follows. Removing the element removes the canvas.

For TypeScript, put `sg-rhizoma.d.mts` beside the module: it types the options, the controller and the events.

**Where the files go.** Copy `docs/embed/sg-rhizoma.mjs` (and `sg-rhizoma.d.mts`) into your source folder and `docs/fonts/` into your public folder, so that your site serves `/fonts/im-fell-english.woff`. Loaded as it is, the script looks for the fonts one folder above itself, so `/embed/sg-rhizoma.js` reads `/fonts/`. When a bundler has renamed it, it looks at the site root. Each falls back to the other, and `SGRhizoma.config({ base: '/assets/sg-rhizoma/' })` sets one place. Serve the fonts from your own site or from a host that sends CORS headers, as GitHub Pages does.

Each recipe below is a tested app: React 19 (StrictMode), Next.js 16 (webpack and Turbopack), Vue 3.5, Nuxt 4, Svelte 5, SvelteKit 2, Astro 5 and Angular 21 (strict TypeScript). Each grows the word, climbs, unmounts without leaving a canvas, mounts again and resizes, with no request off the site and no error.

**React** (and Next.js, with `'use client'` as the first line of the hook file):

```jsx
// useRhizoma.js
import { useEffect, useRef } from 'react';
export function useRhizoma(options) {
  const ref = useRef(null), ctrl = useRef(null);
  useEffect(() => {
    let dead = false;
    import('./sg-rhizoma.mjs').then(({ grow }) => { if (!dead && ref.current) ctrl.current = grow(ref.current, options); });
    return () => { dead = true; if (ctrl.current) ctrl.current.remove(); ctrl.current = null; };
  }, []);
  return [ref, ctrl];
}

// Hero.jsx
export function Hero() {
  const [ref] = useRhizoma({ face: 'roses', field: true, climb: 20, seconds: 40 });
  return <div ref={ref} style={{ height: '100vh', background: '#0A0807', color: '#EBE6D7', fontSize: 56 }}>Roses</div>;
}
```

In Next.js the server sends the heading in its HTML and the browser grows it once the page has loaded. Put `fonts/` in `public/`. In React 19 the element works as `<sg-rhizoma face="roses" field="" climb="20">Roses</sg-rhizoma>` after `import './sg-rhizoma.mjs'`; give a boolean attribute an empty string.

**Vue 3** (and Nuxt 4: the same component, with `fonts/` in `public/`; the dynamic import in `onMounted` keeps it off the server):

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
const el = ref(null); let ctrl = null, dead = false;
onMounted(async () => {
  const { grow } = await import('./sg-rhizoma.mjs');
  if (!dead && el.value) ctrl = grow(el.value, { face: 'roses', field: true, climb: 20, seconds: 40 });
});
onBeforeUnmount(() => { dead = true; if (ctrl) ctrl.remove(); ctrl = null; });
</script>
<template><div ref="el" class="hero">Roses</div></template>
```

For the element, tell the compiler it is not a Vue component: in `vite.config.js`, `vue({ template: { compilerOptions: { isCustomElement: tag => tag === 'sg-rhizoma' } } })`; in `nuxt.config.ts`, `vue: { compilerOptions: { isCustomElement: t => t === 'sg-rhizoma' } }`.

**Svelte 5 and SvelteKit** (an action; in SvelteKit keep the two files in `src/lib` and the fonts in `static/fonts`):

```js
// rhizoma.js
export function rhizoma(node, options) {
  let ctrl = null, dead = false;
  import('./sg-rhizoma.mjs').then(({ grow }) => { if (!dead) ctrl = grow(node, options); });
  return { destroy() { dead = true; if (ctrl) ctrl.remove(); } };
}
```

```svelte
<script>import { rhizoma } from './rhizoma.js';</script>
<div use:rhizoma={{ face: 'roses', field: true, climb: 20, seconds: 40 }}>Roses</div>
```

**Astro** (a page script runs in the browser only; the heading is in the page's HTML):

```astro
<div id="hero">Roses</div>
<script>
  import { grow } from '../sg-rhizoma.mjs';
  grow(document.getElementById('hero'), { face: 'roses', field: true, climb: 20, seconds: 40 });
</script>
```

**Angular** (a standalone component; `sg-rhizoma.d.mts` beside the module gives it types):

```ts
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import type { Controller } from './sg-rhizoma.mjs';

@Component({ selector: 'app-hero', template: `<div #host>Roses</div>` })
export class Hero implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  private ctrl: Controller | null = null;
  private dead = false;
  async ngAfterViewInit() {
    const { grow } = await import('./sg-rhizoma.mjs');
    if (!this.dead) this.ctrl = grow(this.host.nativeElement, { face: 'roses', field: true, climb: 20, seconds: 40 });
  }
  ngOnDestroy() { this.dead = true; this.ctrl?.remove(); this.ctrl = null; }
}
```

For the element in Angular, add `schemas: [CUSTOM_ELEMENTS_SCHEMA]` to the component that uses it and `import './sg-rhizoma.mjs'` once.

Every recipe has one shape: import in the browser once the component is mounted, keep the controller, call `remove()` when the component goes, and ignore an import that arrives after it has gone (the `dead` flag), as StrictMode and fast route changes produce.

### 1.6 An entry screen

The word grows across the whole screen at one steady speed. A click starts the music, the roots withdraw, and the page behind the entry opens.

```html
<section id="entry"><div id="rose">ROSES</div></section>
<script type="module">
  import SGRhizoma from './sg-rhizoma.mjs';
  const entry = document.getElementById('entry');
  const rose = SGRhizoma.grow(document.getElementById('rose'), { face: 'roses', seed: 202, field: true, fixed: true, climb: 20, seconds: 40 });
  entry.addEventListener('click', async () => {
    startMusic();                          // your sound, started inside the click: browsers allow it nowhere else
    rose.stop();                           // the growth stops where it is
    await rose.release({ seconds: 1.4 }); // the roots withdraw from there, and sg:released fires
    entry.remove();                        // the entry is gone
    openTheSite();                         // show the page behind it
  }, { once: true });
</script>
```

The working example is [docs/embed/entry.html](docs/embed/entry.html), live at https://sativus-gourd.github.io/rhizoma-smoke/embed/entry.html: a click withdraws the roots and grows the word again from nothing, where a real site would open its page. A click at any moment withdraws the roots from where they stand, at the width they have.

Two choices are yours: the length of the climb (`seconds`, and with it the speed of the tips, section 1.3), and whether it runs to growth 20 or stops earlier, which is lighter on a phone.

---

## 2. On a website: the web fonts

Every face as WOFF2, split into Latin and Hangul, so a page loads only the script it sets.

```html
<link rel="stylesheet" href="https://sativus-gourd.github.io/rhizoma-smoke/webfonts/sg-rhizoma.css">
```

| Family | Axes |
|---|---|
| `SG Rhizoma Smoke`, `SG Rhizoma Roses`, `SG Rhizoma V2`, `SG Rhizoma Drag`, `SG Rhizoma Flame`, `SG Rhizoma Tangle` | none: the growth as grown |
| `SG Rhizoma Smoke Variable`, `SG Rhizoma V2 Variable`, `SG Rhizoma Drag Variable`, `SG Rhizoma Flame Variable` | `GRWT` (Growth), 0 to 100, and `wght` (Weight), 100 to 900 |
| `SG Rhizoma Roses Variable` | `GRWT` (Growth), 0 to 140, and `wght` (Weight), 100 to 900 |

SG Smoke and SG Roses carry the weights the site draws them at, ×1.5 and ×1.25; the other faces are drawn at ×1. The static SG Roses grows to 12; the Growth axis of SG Roses Variable reaches 10 at 100, 12 at 120 and 14 at 140.

A variable face shows its full growth (100) at its regular weight (400) until told otherwise. Set the axes with `font-variation-settings`, or the weight with `font-weight`:

```css
h1 {
  font-family: "SG Rhizoma Roses Variable", serif;
  font-variation-settings: "GRWT" 60;
}
h2 { font-family: "SG Rhizoma Roses Variable", serif; font-weight: 700; }   /* the Weight axis: 100 thin, 400 regular, 900 black */
```

**Weight.** The `wght` axis scales the line weight of the roots from half the face's own at 100 to twice it at 900, in Latin and Hangul alike. The static fonts are at 400. Browsers set headings bold, at 700, so a heading in a variable face takes the axis at 700: `font-weight: 400` keeps it regular.

**Alternates.** Each Latin letter has three looks. The `calt` feature, on by default, steps through them along a run of text, so a repeated letter changes shape. A space starts the cycle again, and `font-feature-settings: "calt" 0` turns it off.

**Animating the axis.** Browsers animate `font-variation-settings` like any other property:

```css
/* grows on hover */
h1 { font-variation-settings: "GRWT" 0; transition: font-variation-settings 2.4s cubic-bezier(.42, 0, .58, 1); }
h1:hover { font-variation-settings: "GRWT" 100; }

/* grows once, when the page opens */
@keyframes sg-grow { from { font-variation-settings: "GRWT" 0; } to { font-variation-settings: "GRWT" 100; } }
.grows { animation: sg-grow 3s cubic-bezier(.42, 0, .58, 1) both; }
```

The curve `cubic-bezier(.42, 0, .58, 1)` is the one the site grows by.

**Letter by letter.** Give each letter its own delay and the word grows the way it is read:

```html
<h1 class="grows-by-letter">Roses</h1>
<script>
  document.querySelectorAll('.grows-by-letter').forEach(h => {
    h.setAttribute('aria-label', h.textContent);
    h.innerHTML = [...h.textContent].map((c, i) =>
      `<span aria-hidden="true" class="grows" style="animation-delay:${i * 60}ms">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  });
</script>
```

**How the fonts move.** A variable font blends stages of one growth (0 to 100; SG Roses on to 140), so every root lengthens at once. For the engine's own motion, use the embed.

**Size.** As WOFF2, a Latin face is 0.5 to 1.4 MB and a Latin variable face 1.8 to 5.1 MB. A Hangul file is 1.3 to 4.1 MB, or 5.4 to 14.4 MB for a variable face, and loads only when the page sets Hangul.

---

## 3. In After Effects: the variable fonts

After Effects animates variable font axes from version 26.0 (January 2026), the custom Growth axis included.

1. Download a variable face from the site (Download, then the face with Variable in its name) and install it. Restart After Effects.
2. Make a text layer and set it in the face, for instance SG Rhizoma Roses Variable.
3. In the Character panel, set Growth to 0: the bare letter.
4. Add an animator: Animate > Variable Font Axes > Growth. Set the animator's Growth to 100.
5. The animator comes with a Range Selector. Keyframe its **End** from 0% to 100% over two to four seconds, and ease the keyframes. With the selector's Shape at Square and Smoothness at 100% (under Advanced, both the defaults), each letter grows as the end of the range passes over it, in reading order.

For one growth across the whole word, keyframe Growth in the Character panel instead, 0 to 100. A Wiggly Selector on the Growth animator makes the growth breathe in and out, letter by letter: a good fit for SG Flame.

A Latin letter has three looks in a font, each with one growth, so repeated letters grow in at most three ways, and in an app without contextual alternates all alike. For a growth that differs at every letter, record from the engine (section 4).

---

## 4. On video: record from the SG Rhizoma Engine

The engine records what it plays, as transparent PNG frames or as a video.

1. Set the text, face, colour, growth, weight and seed, and press Replay until the growth is the one you want. Release shows how the roots withdraw.
2. Press **Record**, the red dot under the preview, make your choices and press Start recording or Render frames.

| Choice | Options |
|---|---|
| Take | Grow, Release, or Grow then release |
| Format | PNG frames, transparent, or Video, in real time |
| Frame rate | 24, 25, 30 or 60 frames a second (60 by default) |
| Size | 1920 × 1080 (the default), or 1080 × 1920 for a vertical cut; for PNG frames also 3840 × 2160 (4K) and 2160 × 3840 |
| Speed | ×0.1, ×0.25, ×0.5 or ×1 (the default): the same growth, slower |
| Hold | For a video of both: 0, 1.5 (the default), 3 or 5 seconds on the finished growth |
| Frames go | Into zips (the default) or, in Chrome and Edge, straight into a folder you choose |

**PNG frames** are for an editor. A take holds `grow/`, from the bare word to the finished growth, and `release/`, back to the bare word, as numbered frames, with a README that gives its settings so the same frames can be made again. The ground is transparent and the roots solid, so the frames lie over footage with no blend mode.

Import each folder as an image sequence at the frame rate you chose, hold the last frame of `grow/` for as long as the cut needs, then play `release/`. The frames are made in your browser, with nothing sent anywhere.

**Speed.** ×0.5, ×0.25 and ×0.1 give the same growth over two, four or ten times the frames, for slow motion. Replay, Play and Release on the page follow the speed, so you can watch a take before you record it.

**Into a folder.** In Chrome and Edge, choose the folder under Frames go: Render frames asks for a folder and writes the frames into it as they are drawn, with no zips. Cancel keeps what is written.

**4K.** 3840 × 2160 and 2160 × 3840 are the 1080p composition at twice the scale, so a 4K frame lines up with the 1080p one. A heavy 4K take wants a desktop with other tabs closed: SG Roses at growth 20 and 60 frames a second comes to about 250 MB. A take over 125 MB comes in several zips (`name_part1.zip`, `name_part2.zip` and so on), saved one after another; unzip them into one folder and the frame numbers carry on. If the browser runs out of memory, the panel says so.

**Video** records in real time: the growth, the hold, then the release. Keep its tab in front, since a tab in the background stops drawing; the recording then stops and nothing is saved. Video stays at 1080p.

- **Format:** MP4 in browsers that record it (recent Chrome and Safari), WebM in others, such as Firefox. If your editor will not open a WebM file, record in Chrome or Safari, or use the frames.
- **Ground:** the colour's own ground, solid. A clip has no transparency.

**Putting a video over footage.** Record in **Bone** (light roots on near-black) and set the clip's blend mode to **Screen**: the black falls away and the roots stay, in After Effects, Premiere Pro, DaVinci Resolve and Final Cut Pro alike. For dark roots over light footage, record in Bone, invert the clip, and set it to **Multiply**. The Void ground is paper, not white, so a Void clip set to Multiply tints what lies under it.

**Recording well.** A video of a heavy growth (SG Roses or SG Rhizoma V2 near 20) wants a desktop with other tabs closed, or it drops frames. PNG frames never drop one.

---

## 5. Stills and vectors: SVG

Beside Record, under the preview (hover for the name):

- **Copy layered SVG**: roots and letters as separate shapes, in two groups, `GROWTH` and `GLYPH`, to recolour them apart in Illustrator or Figma, or to move a root.
- **Copy united SVG**: roots and letters as one shape, for a cutter, a stamp, a mask or a single fill.
- **Copy embed code**: the snippet that grows what is on screen on a web page (section 1).
- **Save SVG**: the united shape as a file.

The file name carries the face, seed, growth and weight (`rhizoma-smoke_SG-Roses_seed202_growth12-12_weight1.25.svg`), so with the text it finds the same growth again.

Recent versions of After Effects import SVG as shape layers. The roots are filled outlines, so an SVG holds the finished growth: use it for stills, prints and masks, and a recording or the variable fonts for motion.

---

## Credits and licences

- **Fonts** (the downloads and the web fonts): SIL Open Font License 1.1. Use them in any work, commercial included, and credit Sativus Gourd where you can. A changed font takes a name of its own, not SG Rhizoma, SG Smoke or SG Roses.
- **The embed** (`docs/embed/sg-rhizoma.js` and `sg-rhizoma.mjs`): the SG Rhizoma Engine, adapted from Rhizoma Engine v.01 by Dabin Kim, under CC BY-SA 4.0. Credit Dabin Kim and Sativus Gourd where you use it, and share changes to the script under the same licence. It bundles opentype.js 1.3.4 (MIT), whose licence sits in the banner of both files: keep the banner when you minify or bundle (minifiers keep a `/*!` comment).
- **Not covered**: the Sativus Gourd name, signature and logo, and the atelier's artwork on the site.

Sources: [After Effects: working with variable font axes](https://helpx.adobe.com/after-effects/desktop/variable-font-axes/work-with-variable-font-axes/working-with-variable-font-axes.html), [After Effects expressions: variable fonts (26.0)](https://ae-expressions.docsforadobe.dev/text/variable-fonts/), [After Effects: import SVG files](https://helpx.adobe.com/after-effects/desktop/import-files/import-svg-files/import-svg-files.html), [MDN: font-variation-settings](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variation-settings).
