# Using the growth: on a website, in After Effects, on video

The SG Rhizoma growth leaves this site in five forms. Pick the one that fits the work:

| You want | Use | Moves like the site |
|---|---|---|
| A heading, a section or a whole screen that grows on a web page | The embed, `docs/embed/sg-rhizoma.js` or `.mjs` | Yes: the same engine, every root on its own clock |
| Text set in the fonts, on the web | The web fonts, `docs/webfonts/` | The variable fonts grow on their Growth axis |
| Moving type in After Effects | The variable fonts, from Download on the site | On the Growth axis, keyframed |
| A clip for any editor | Record in the SG Rhizoma Engine on the site | Yes: exactly as it plays on screen |
| A still, a print, a mask | SVG from the SG Rhizoma Engine | The finished growth |

One difference runs through all of it. The SG Rhizoma Engine grows each root on a clock of its own: the thick roots set out first, a branch starts when its parent's tip reaches it, and every occurrence of a letter grows differently. The fonts carry one growth per character, and their Growth axis lengthens every root together, from the bare letter at 0 to the full growth at 100. For the engine's motion, use the embed or a recording; for type you can set, edit and animate per letter, use the fonts.

---

## 1. On a website: the embed

The live engine, in one script or one module. A heading keeps its text for screen readers, search and copying; the growth is drawn over it. The same engine fills a section or the whole screen, continues a growth that is already on screen, and runs in the major front-end stacks (section 1.5).

### 1.1 A heading

```html
<script src="https://sativus-gourd.github.io/rhizoma-smoke/embed/sg-rhizoma.js" defer></script>

<h1 data-sg-rhizoma="roses" data-seed="202">Roses</h1>
```

The heading grows when a fifth of it comes into view, once.

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

**Finding a seed.** Type your text into the SG Rhizoma Engine on the site, press Randomise until a growth holds, and copy the number from the Seed field. The same text, face, growth and seed grow the same shape in the embed.

**Line weight.** The width of every root is a multiplier, as in the original Rhizoma's Line Weight slider. A face grows with the weight that suits it: SG Smoke at 1.5 (its roots rise above the word), SG Roses at 1.25 (its roots lie over the word, and heavier begins to fill the letters), and SG Rhizoma V2, Drag, Flame and Tangle at 1, which is V2's original setting. `fine` and `heavy` are the face's lighter and heavier presets (SG Smoke 1 and 2, SG Roses 1 and 1.5, the others 0.75 and 1.5). The weight changes only how wide the roots are: the same seed grows the same shape at any weight, so you can set it after you have found a seed. At high growth the roots fill the space round the letters, so SG Smoke's own weight eases from 1.5 (growth 12 and below) to 1.4 at growth 14, 1.35 at 16 and 1.3 from 18; SG Roses holds 1.25. These limits come from 5,832 test renders: nine scenes in ten stay clear of the point where roots begin to fill the letters. Growths made before v19.17 were drawn at 1: use `data-weight="1"` to match them.

**Room.** Roots reach past the text, above and below, and at high growth well beyond it. Give the heading padding: about half its font size above and below at growth 10, and more for SG Roses and SG Rhizoma V2 above 15, where the growth spreads to several times the height of the word. A field (next) has no such limit: it clips at its own edge.

**From a script.** `SGRhizoma.grow(element, options)` grows at once and returns a controller. The options are the attributes without `data-`, plus `text` to grow a text other than the element's own.

```html
<script>
  addEventListener('DOMContentLoaded', () => {
    const h = document.querySelector('#title');
    const g = SGRhizoma.grow(h, { face: 'roses', seed: 202, growth: '12' });
    h.addEventListener('mouseenter', () => g.replay());   // grows again on every hover
  });
</script>
```

The controller: `ready` (a promise, true at the first frame), `replay()`, `setGrowth(n)`, `climb(n, { seconds })`, `release({ seconds })`, `snapshot({ type })`, `setWeight(w)`, `setColour(c)`, `redraw()`, `stop()`, `remove()`, and `growth`, `state` and `element` to read. Each method that takes time returns a promise that is true when it has finished and false when something replaced it.

**Cost on the visitor's device.** The growth is computed and drawn in the visitor's browser. At growth 10 a heading is light on a phone. At growth 20, SG Roses and SG Rhizoma V2 grow over a thousand roots and play at 15 to 20 frames a second in our test at a quarter of desktop speed, a stand-in for a mid-range phone; keep those for one hero word on a page, and try it on the phones your visitors use. A climb (section 1.3) draws less: roots that have finished are kept as a picture, and only the growing tips are drawn each frame. Visitors who ask for reduced motion see the finished growth at once.

### 1.2 A field: a section or the whole screen

```html
<script src="https://sativus-gourd.github.io/rhizoma-smoke/embed/sg-rhizoma.js" defer></script>

<sg-rhizoma face="roses" seed="202" field climb="20" seconds="40"
            style="display:block; height:100vh; background:#0A0807; color:#EBE6D7; font-size:56px">Roses</sg-rhizoma>
```

In a field the canvas fills the element edge to edge, with no border, on a desktop and on a phone. The word sits in the middle at one size, half the element's width (four fifths below 640 px, and never taller than 42% of its height), and the roots run out to the edges and past them: the element clips them, so the picture is not shrunk to keep them in. The size does not change as the growth rises. SG Roses at growth 18 reaches about one word's width from the word on each side, and at growth 20 about two, so a screen fills without further settings.

- The element's background is the ground, and its text colour is the ink.
- `fixed` makes the canvas the screen itself: it stays fixed to the viewport, whatever the element's size. Use it for an entry.
- The pixel ratio is capped at 2 (`dpr` changes that) and drops to 1.5, and no lower, when frames keep running slow, so the growth keeps its pace on a weak phone and the roots stay sharp.
- A resize refits the same growth to the new size without growing it again. Painting stops while the element is off screen. Reduced motion shows the finished frame.
- The heading text stays in the page, hidden from the eye and open to readers and search.

### 1.3 Continue a growth

`setGrowth(14)` takes the growth on screen to 14. `climb(20, { seconds: 40 })` takes it to 20 over 40 seconds, as one growth: every tip moves at one speed from the first frame to the last, with no steps to stall at. `climb` and `seconds` as attributes or options with nothing drawn yet grow the word straight to that growth, from nothing, in those seconds. This is what an entry should use: nothing is drawn twice, and no root is drawn wider once it has stopped. With a `growth` also given, the word grows to that first and then climbs on from it.

**The speed.** A growth is a number of steps (for the word ROSES at growth 20: SG Roses 657, SG Smoke 442, SG Drag 567, SG Flame 657, SG Tangle 697) and the seconds you give are shared out evenly over them. SG Roses to 20 in 40 seconds is 16 steps a second, about 44 px a second at a word 640 px wide; in 25 seconds it is 26 steps a second. The growths of the page's own headings run at about 70 to 130 steps a second.

At a higher growth, SG Smoke, SG Roses, SG Drag, SG Flame and SG Tangle keep every root they had, carry some tips further and add roots of their own. Continuing a growth that is already drawn shows exactly that: the roots already grown stay where they are, the stopped tips go on, and the new roots set out. The last frame is the picture you would get by growing that growth from nothing; the test checks it to the pixel on all five faces. A root that goes on is drawn along its whole length, so it grows wider as its tip runs on. Measured from one growth to the next (SG Roses, growth 12 to 20): where a root had stopped it ends up 1.6 to 1.9 times as wide, and half way along its length 1.1 to 1.25 times. That is the difference between continuing and the first growth of the entry, where each root is drawn once, as it grows. SG Rhizoma V2 grows a new plant at each growth and has nothing to carry on, so it plays the new growth whole. A lower growth also plays whole. After `release()` the next growth plays whole from the word.

A growth is built in one piece on the page's thread, and the heading stays in the page until its first frame is drawn. For a climb from nothing that is one build, before the first frame, and none after it. In our tests, a fixed field on a 390 px phone screen at pixel ratio 3, climbing to 18 over 20 seconds:

| Face | First frame, full speed | First frame, a quarter of desktop speed | Frames at a quarter of desktop speed (median, slowest 5%) |
|---|---|---|---|
| SG Smoke | 56 ms | 0.2 s | 50 ms, 100 ms |
| SG Roses | 250 ms | 0.6 s | 67 ms, 100 ms |
| SG Flame | 140 ms | 0.45 s | 50 ms, 67 ms |
| SG Rhizoma V2 | 100 ms | 0.26 s | 17 ms, 50 ms |
| SG Drag | 0.8 s | 2.3 s | 50 ms, 83 ms |
| SG Tangle | 1.4 s | 13.5 s | 33 ms, 83 ms |

At full speed every face holds 60 frames a second, with no frame over 50 ms. At a quarter of desktop speed the frames are 15 a second for SG Roses, 20 for SG Smoke, SG Flame and SG Drag, and 30 to 60 for SG Tangle and SG Rhizoma V2, and the growth takes 1.2 to 1.9 times as long as asked, because it is timed by the clock and a frame that runs long is caught up by only two frames' worth. The figures come from a two-core cloud machine; on a slower day the same machine gave about twice the times, so read them as an order of magnitude. A climb that starts from a growth already drawn builds the end of the climb in one piece, as it begins. For a climb on a phone, choose SG Smoke, SG Roses, SG Flame or SG Rhizoma V2; SG Tangle to 18 suits a desktop only, or a `setGrowth` to a lower growth.

### 1.4 Events, release and snapshot

Events fire on the element and bubble, so one listener on `document` hears every element.

| Event | When | `detail` |
|---|---|---|
| `sg:ready` | the first frame is drawn, and the heading text is hidden | `{ growth, face }` |
| `sg:level` | a growth is reached (once, at the end, for a climb from nothing) | `{ growth, roots }` |
| `sg:settled` | nothing is left to play: once at the end of a climb | `{ growth }` |
| `sg:released` | `release()` has withdrawn the roots | `{ growth }` |
| `sg:error` | the fonts, the build or the drawing failed, and the heading is back | `{ stage, error }` |

**`release({ seconds })`** withdraws the roots, the last grown first, and leaves the word; 1.1 seconds unless you say otherwise. Where drawing backwards is too heavy for the device, it fades the canvas out in the same time. Reduced motion cuts at once. `sg:released` fires when it is done.

**`snapshot()`** returns the current scene at its finished growth as a PNG `Blob`, transparent unless you pass `{ background: true }`, or as an SVG string with `{ type: 'svg' }`. Stills for a scroll can come from it: grow an element at the growth you want with `autoplay: false`, take the snapshot and remove the element.

**Fail-soft.** The heading text stays visible until the first frame is drawn, and stays visible while the fonts load. If the fonts do not load, or the build or a frame fails, the canvas is removed, the heading is as it was, `sg:error` fires and `ready` resolves to false. The script makes no request to any host but your own: opentype.js 1.3.4 (MIT) is bundled inside it.

### 1.5 In your stack

Three ways in, one engine:

- **A script tag**, for a plain page, WordPress, Webflow, Squarespace, Shopify and any other that lets you add a script and some HTML. Put it in the head with `defer`, at the end of the body, with `async`, or add it after the page has loaded: all work. Use `data-sg-rhizoma` or `<sg-rhizoma>`.
- **A module**, `docs/embed/sg-rhizoma.mjs`: `import SGRhizoma, { grow } from './sg-rhizoma.mjs'`. Importing it on a server is safe, and every call there does nothing and returns an inert controller, so a server-rendered component may import it. Grow in the browser: in an effect, `onMounted`, an action or a script.
- **The element** `<sg-rhizoma>`: attributes in (`face`, `seed`, `growth`, `colour`, `ground`, `scale`, `weight`, `text`, `field`, `fixed`, `size`, `dpr`, `pace`, `climb`, `seconds`, `replay`, `autoplay`), events out, methods on the element (`el.climb(20)`, `el.release()`, `el.snapshot()`, `el.ready`). The `growth`, `weight` and `colour` attributes are live: set one and the word follows. Removing the element removes the canvas.

For TypeScript, put `sg-rhizoma.d.mts` beside the module: it types the options, the controller and the events.

**Where the files go.** Copy `docs/embed/sg-rhizoma.mjs` (and `sg-rhizoma.d.mts`) into your source folder and the `docs/fonts/` folder into your public folder, so that `/fonts/im-fell-english.woff` is served by your site. The script looks for the fonts above itself when you load the file as it is (`/embed/sg-rhizoma.js` reads `/fonts/`), and at the site root when a bundler has renamed it; either falls back to the other, and `SGRhizoma.config({ base: '/assets/sg-rhizoma/' })` fixes one place. Serve the fonts from your own site or from a host that sends CORS headers, as GitHub Pages does.

Each recipe below is the code of a test app, built and run in a real browser: React 19.3 (StrictMode on), Next.js 16.4 (webpack and Turbopack, server rendered), Vue 3.5, Nuxt 4.5, Svelte 5.57, SvelteKit 2.70, Astro 5.18 and Angular 21.2 (strict TypeScript). Each grows the word, climbs, unmounts without leaving a canvas, mounts again, resizes, makes no request off the site and logs no error. The `<sg-rhizoma>` element was run in React, Vue, Svelte and Angular too.

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

In Next.js the server sends the heading in its HTML, and the browser grows it once the page has loaded. Put `fonts/` in `public/`. The element works in React 19 as `<sg-rhizoma face="roses" field="" climb="20">Roses</sg-rhizoma>` after `import './sg-rhizoma.mjs'`; give a boolean attribute an empty string.

**Vue 3** (and Nuxt 4: the same component, with `fonts/` in `public/`; the dynamic import in `onMounted` keeps the server from running it):

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

To use the element, tell the compiler it is not a Vue component: in `vite.config.js`, `vue({ template: { compilerOptions: { isCustomElement: tag => tag === 'sg-rhizoma' } } })`; in `nuxt.config.ts`, `vue: { compilerOptions: { isCustomElement: t => t === 'sg-rhizoma' } }`.

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

**Angular** (standalone component; `sg-rhizoma.d.mts` beside the module gives it types):

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

Every recipe has the same shape: import in the browser after the component is mounted, keep the controller, call `remove()` when the component goes, and ignore an import that arrives after it has gone (the `dead` flag), which is what StrictMode and fast route changes produce.

### 1.6 An entry: SG Roses fills the screen, a click opens the site

The word grows across the whole screen, as one growth at one steady speed. A click starts the music, the roots withdraw, the entry disappears and the page behind it opens, for instance as an infinite scroll of stills.

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
    openTheSite();                         // the page behind it, the scroll of stills
  }, { once: true });
</script>
```

A working page with the sound unlock and four stills taken with `snapshot()` is [docs/embed/entry.html](docs/embed/entry.html), live at https://sativus-gourd.github.io/rhizoma-smoke/embed/entry.html. Two choices are yours: the length of the climb (`seconds`, and with it the speed of the tips, see 1.3), and whether the entry runs to growth 20 or stops earlier, where a phone has more room to spare. A click at any moment withdraws the roots from the growth as it stands: the roots do not jump to their full growth first. We measured a 390 px phone screen at pixel ratio 3, slowed to a quarter of desktop speed, growing SG Roses to 18 over 20 seconds: the first frame after 0.6 s, and frames at a median of 67 ms (15 a second). At full speed the frames were 60 a second. We have not yet run it on a physical phone.

---

## 2. On a website: the web fonts

Every face as WOFF2, split into Latin and Hangul, so a page loads only the script it sets.

```html
<link rel="stylesheet" href="https://sativus-gourd.github.io/rhizoma-smoke/webfonts/sg-rhizoma.css">
```

| Family | Growth axis |
|---|---|
| `SG Rhizoma Smoke`, `SG Rhizoma Roses`, `SG Rhizoma V2`, `SG Rhizoma Drag`, `SG Rhizoma Flame`, `SG Rhizoma Tangle` | none: the growth as grown |
| `SG Rhizoma Smoke Variable`, `SG Rhizoma Roses Variable`, `SG Rhizoma V2 Variable`, `SG Rhizoma Drag Variable`, `SG Rhizoma Flame Variable` | `GRWT`, 0 to 100 |

SG Smoke and SG Roses carry the weights the site draws them at, ×1.5 and ×1.25; the other faces are drawn at ×1. The static SG Roses grows to 12, and the Growth axis of SG Roses Variable reaches 10 at 100.

A variable face shows its full growth (100) until told otherwise. Set the axis with `font-variation-settings`:

```css
h1 {
  font-family: "SG Rhizoma Roses Variable", serif;
  font-variation-settings: "GRWT" 60;
}
```

**Animating the axis.** Browsers animate `font-variation-settings` like any other property. Two ways in:

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

**How the fonts move.** Each variable font is built from six stages of one growth (0, 20, 40, 60, 80 and 100), and the axis blends between them. Every root lengthens at once from where it starts, with a slight change of speed at each stage. For the engine's own motion, use the embed.

**Weight.** As WOFF2, a Latin face is 0.14 to 0.45 MB and a Latin variable face 0.28 to 0.6 MB. The Hangul files run from 1.2 to 6.1 MB and load only when the page sets Hangul.

---

## 3. In After Effects: the variable fonts

After Effects animates variable font axes from version 26.0 (January 2026), the custom Growth axis included.

1. Download a variable face from the site (Download, then the face with Variable in its name) and install it. Restart After Effects.
2. Make a text layer and set it in the face, for instance SG Rhizoma Roses Variable.
3. In the Character panel, set Growth to 0: the bare letter.
4. Add an animator: Animate > Variable Font Axes > Growth. Set the animator's Growth to 100.
5. The animator comes with a Range Selector. Keyframe its **End** from 0% to 100% over two to four seconds, and ease the keyframes. With the selector's Shape at Square and Smoothness at 100% (under Advanced, as they come), each letter grows as the end of the range passes over it, one after another, in reading order.

For one growth across the whole word, skip the animator and keyframe Growth in the Character panel, 0 to 100. A Wiggly Selector on the Growth animator makes the growth breathe in and out, letter by letter: a good fit for SG Flame. Try one word before a whole piece.

In a font, every occurrence of a character carries the same growth, so the two o's in a word grow alike. For a growth that differs at every letter, record from the engine (section 4).

---

## 4. On video: record from the SG Rhizoma Engine

The SG Rhizoma Engine at the top of the site records what it plays.

1. Type the text, choose the face, the colour, the growth, the line weight and the seed. Press Replay until the growth is the one you want.
2. Press **Record**. The engine plays the growth from the first root to the last on a canvas of its own and saves the file.

| | |
|---|---|
| Size | 1920 × 1080 |
| Frame rate | 30 frames a second |
| Format | MP4 in browsers that record it (recent Chrome and Safari); WebM in others, such as Firefox |
| Length | the growth as it plays on screen (1.6 to 5 seconds), then 1.5 seconds on the finished growth |

If your editor will not open a WebM file, record in Chrome or Safari.

**Putting it over footage.** Record in **Bone** (light roots on near-black) and set the clip's blend mode to **Screen**: the black falls away and the roots stay, in After Effects, Premiere Pro, DaVinci Resolve and Final Cut Pro alike. For dark roots over light footage, record in Bone, invert the clip, and set it to **Multiply**. The Void ground is paper, not white, so a Void clip set to Multiply tints what lies under it.

**Recording well.** The engine records in real time. For the heaviest growths (SG Roses and SG Rhizoma V2 near 20), record on a desktop computer with other tabs closed, so no frame is dropped.

---

## 5. Stills and vectors: SVG

Under the engine's canvas:

- **Copy layered SVG**: roots and letters as separate shapes, in two groups, `GROWTH` and `GLYPH`. Paste into Illustrator or Figma to recolour roots and letters apart, or to move a root.
- **Copy united SVG**: roots and letters as one shape, for a cutter, a stamp, a mask or a single fill.
- **Save SVG**: the united shape as a file.

The line weight is part of the picture, so it goes into the file name and the SVG's group name (`rhizoma-smoke_SG-Roses_seed202_growth12-12_weight1.25.svg`): with the text, the face, the growth and the seed, it finds the same growth again.

Recent versions of After Effects import SVG as shape layers. The roots are filled outlines, so the SVG holds the finished growth: use it for stills, prints and masks, and a recording or the variable fonts for motion.

---

## Credits and licences

- **Fonts** (the downloads and the web fonts): SIL Open Font License 1.1. Use them in any work, commercial included.
- **The embed** (`docs/embed/sg-rhizoma.js` and `sg-rhizoma.mjs`): the SG Rhizoma Engine, adapted from Rhizoma Engine v.01 by Dabin Kim, under CC BY-SA 4.0. Credit Dabin Kim and Sativus Gourd where you use it, and share changes to the script under the same licence. It bundles opentype.js 1.3.4 (MIT).
- **Not covered**: the Sativus Gourd name, signature and logo, and the atelier artwork shown on the site.

Sources for the tools named here: [After Effects: working with variable font axes](https://helpx.adobe.com/after-effects/desktop/variable-font-axes/work-with-variable-font-axes/working-with-variable-font-axes.html), [After Effects expressions: variable fonts (26.0)](https://ae-expressions.docsforadobe.dev/text/variable-fonts/), [After Effects: import SVG files](https://helpx.adobe.com/after-effects/desktop/import-files/import-svg-files/import-svg-files.html), [MDN: font-variation-settings](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variation-settings).
