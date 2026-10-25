# Using the growth: on a website, in After Effects, on video

The SG Rhizoma growth leaves this site in five forms. Pick the one that fits the work:

| You want | Use | Moves like the site |
|---|---|---|
| A heading that grows on a web page | The embed, `docs/embed/sg-rhizoma.js` | Yes: the same engine, every root on its own clock |
| Text set in the fonts, on the web | The web fonts, `docs/webfonts/` | The variable fonts grow on their Growth axis |
| Moving type in After Effects | The variable fonts, from Download on the site | On the Growth axis, keyframed |
| A clip for any editor | Record in the SG Rhizoma Engine on the site | Yes: exactly as it plays on screen |
| A still, a print, a mask | SVG from the SG Rhizoma Engine | The finished growth |

One difference runs through all of it. The SG Rhizoma Engine grows each root on a clock of its own: the thick roots set out first, a branch starts when its parent's tip reaches it, and every occurrence of a letter grows differently. The fonts carry one growth per character, and their Growth axis lengthens every root together, from the bare letter at 0 to the full growth at 100. For the engine's motion, use the embed or a recording; for type you can set, edit and animate per letter, use the fonts.

---

## 1. On a website: the embed

The live engine, in one script. A heading keeps its text for screen readers, search and copying; the growth is drawn over it.

```html
<script src="https://sativus-gourd.github.io/rhizoma-smoke/embed/sg-rhizoma.js" defer></script>

<h1 data-sg-rhizoma="roses" data-seed="202">Roses</h1>
```

The heading grows when a fifth of it comes into view, once.

| Attribute | Does | Default |
|---|---|---|
| `data-sg-rhizoma` | the face: `smoke`, `roses`, `drag`, `v2`, `flame` or `tangle` | `smoke` |
| `data-seed` | the seed; the same seed grows the same shape every time | the face's font seed |
| `data-growth` | `10`, or a rise or fall through the text such as `2-18`, from 0 to 20 | `10` |
| `data-colour` | the ink | the heading's colour |
| `data-scale` | the grown word's size against the heading's | `1` |
| `data-replay` | a click grows it again | off |

**Finding a seed.** Type your text into the SG Rhizoma Engine on the site, press Randomise until a growth holds, and copy the number from the Seed field. The same text, face, growth and seed grow the same shape in the embed.

**Room.** Roots reach past the text, above and below, and at high growth well beyond it. Give the heading padding: about half its font size above and below at growth 10, and more for SG Roses and SG Rhizoma V2 above 15, where the growth spreads to several times the height of the word.

**Growing again, on your terms.** The script can drive any heading:

```html
<script>
  addEventListener('DOMContentLoaded', () => {
    const h = document.querySelector('#title');
    const g = SGRhizoma.grow(h, { face: 'roses', seed: 202, growth: '12' });
    h.addEventListener('mouseenter', () => g.replay());   // grows again on every hover
  });
</script>
```

`SGRhizoma.grow(element, options)` grows at once and returns `{ replay, stop, redraw, remove, ready }`. The options are the attributes without `data-`: `face`, `seed`, `growth`, `colour`, `scale`, plus `text` to grow a text other than the element's own.

**Weight on the visitor's device.** The growth is computed and drawn in the visitor's browser. At growth 10 a heading is light on a phone. At growth 20, SG Roses and SG Rhizoma V2 grow over a thousand roots and play at around 20 frames a second on a mid-range phone; keep those for one hero word on a page. Visitors who ask for reduced motion see the finished growth at once.

**Hosting it yourself.** Copy `docs/embed/sg-rhizoma.js` with `docs/fonts/im-fell-english.woff` and `docs/fonts/song-myung-korean.woff`, keeping the folders, or point the script at your fonts:

```js
SGRhizoma.config({ base: '/assets/sg-rhizoma/' });   // the folder that holds fonts/
```

Hangul loads Song Myung only when a heading needs it.

---

## 2. On a website: the web fonts

Every face as WOFF2, split into Latin and Hangul, so a page loads only the script it sets.

```html
<link rel="stylesheet" href="https://sativus-gourd.github.io/rhizoma-smoke/webfonts/sg-rhizoma.css">
```

| Family | Growth axis |
|---|---|
| `SG Rhizoma Smoke`, `SG Rhizoma Roses`, `SG Rhizoma Drag`, `SG Rhizoma V2`, `SG Rhizoma Flame`, `SG Rhizoma Tangle` | none: the growth as grown |
| `SG Rhizoma Smoke Variable`, `SG Rhizoma Roses Variable`, `SG Rhizoma Drag Variable`, `SG Rhizoma V2 Variable`, `SG Rhizoma Flame Variable` | `GRWT`, 0 to 100 |

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

1. Type the text, choose the face, the colour, the growth and the seed. Press Replay until the growth is the one you want.
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

Recent versions of After Effects import SVG as shape layers. The roots are filled outlines, so the SVG holds the finished growth: use it for stills, prints and masks, and a recording or the variable fonts for motion.

---

## Credits and licences

- **Fonts** (the downloads and the web fonts): SIL Open Font License 1.1. Use them in any work, commercial included.
- **The embed** (`docs/embed/sg-rhizoma.js`): the SG Rhizoma Engine, adapted from Rhizoma Engine v.01 by Dabin Kim, under CC BY-SA 4.0. Credit Dabin Kim and Sativus Gourd where you use it, and share changes to the script under the same licence.
- **Not covered**: the Sativus Gourd name, signature and logo, and the atelier artwork shown on the site.

Sources for the tools named here: [After Effects: working with variable font axes](https://helpx.adobe.com/after-effects/desktop/variable-font-axes/work-with-variable-font-axes/working-with-variable-font-axes.html), [After Effects expressions: variable fonts (26.0)](https://ae-expressions.docsforadobe.dev/text/variable-fonts/), [After Effects: import SVG files](https://helpx.adobe.com/after-effects/desktop/import-files/import-svg-files/import-svg-files.html), [MDN: font-variation-settings](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variation-settings).
