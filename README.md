# Rhizoma Smoke

The SG Rhizoma Engine and the SG Rhizoma Typeface Family by Sativus Gourd, led by SG Smoke.
Built on [Rhizoma](https://github.com/dabinkiim/Rhizoma), the growing type system by Dabin Kim.

**Website:** https://sativus-gourd.github.io/rhizoma-smoke/
**Guide:** [GUIDE.md](GUIDE.md), for the growth on a website, in After Effects and on video

Type into the SG Rhizoma Engine and watch the letters grow, every root on a clock of its own, the thickest first and the
finest last. Let growth rise or fall through a text, bring any growth back from its seed, save it as SVG or video, and
download the fonts. Leave the page open and it keeps growing.

## The SG Rhizoma Typeface Family
- Core: SG Smoke, SG Roses, SG Rhizoma V2
- Experimental: SG Drag, SG Flame, SG Tangle
- Variable: every core face again, as SG Smoke Variable, SG Roses Variable and SG Rhizoma V2 Variable, and SG Drag Variable and SG Flame Variable among the experiments, with a Growth axis from the bare letter (0) to the full growth (100)

## Fonts
Free fonts in `docs/downloads/`, to install, and in `docs/webfonts/`, for the web. Each carries 212 Latin characters from
IM Fell English, five ligatures and 2,897 kerning pairs. All but SG Tangle also carry Hangul: the 2,350 syllables of
KS X 1001 and 51 jamo. SG Rhizoma V2 and SG Rhizoma V2 Variable are grown with Dabin Kim's Rhizoma at its default settings.

## Use it on your site

### Grow a heading
One script, and an attribute on any heading:

```html
<script src="https://sativus-gourd.github.io/rhizoma-smoke/embed/sg-rhizoma.js" defer></script>

<h1 data-sg-rhizoma="smoke">Cultivate your garden</h1>
```

The heading grows when it first comes into view, with the same engine and motion as the site.

| Attribute | Does | Default |
|---|---|---|
| `data-sg-rhizoma` | the face: `smoke`, `drag`, `roses`, `v2`, `flame` or `tangle` | `smoke` |
| `data-seed` | the seed; the same seed grows the same shape every time | the face's font seed |
| `data-growth` | `10`, or a rise or fall through the text such as `2-18` (0 to 20) | `10` |
| `data-colour` | the ink | the heading's colour |
| `data-scale` | the grown word's size against the heading's | `1` |
| `data-weight` | line weight: a number from 0.5 to 2, or `fine`, `earthy` or `heavy` | `earthy` (the face's own: SG Smoke 1.5, SG Roses 1.25, the others 1) |
| `data-replay` | a click grows it again | off |

From a script: `SGRhizoma.grow(element, { face: 'drag', seed: 33, growth: '2-18' })` returns `{ replay, stop, redraw, remove }`.

- The heading keeps its text for screen readers, search and copying; the grown word is drawn over it.
- Roots reach past the text, so give the heading room.
- Reduced motion shows the finished growth at once.
- Hangul loads Song Myung only when a heading needs it.
- To host it yourself, copy `docs/embed/sg-rhizoma.js` with `docs/fonts/im-fell-english.woff` and
  `docs/fonts/song-myung-korean.woff`, keeping the folders, or point it at your fonts with `SGRhizoma.config({ base: '/path/' })`.

Example: [docs/embed/index.html](docs/embed/index.html), live at https://sativus-gourd.github.io/rhizoma-smoke/embed/. More in [GUIDE.md](GUIDE.md): growing on hover, room around a heading, weight on phones.

### Set text in the fonts
```html
<link rel="stylesheet" href="https://sativus-gourd.github.io/rhizoma-smoke/webfonts/sg-rhizoma.css">
<style>
  h1 { font-family: "SG Rhizoma Smoke Variable", serif; font-variation-settings: "GRWT" 60; }
</style>
```

Every face as WOFF2, split into Latin and Hangul so a page loads only the script it sets. The outlines are the
installable fonts' own, unchanged. [GUIDE.md](GUIDE.md) shows how to animate the Growth axis with CSS, and in After Effects.

## What the SG Rhizoma Engine adds to Rhizoma
Hangul, seeds that bring any growth back, growth that rises or falls letter by letter, variable fonts with a Growth axis,
growth fitted to each face, roots that start on the outline and leave their stroke cleanly, roots that join across letters
and lines, drift, taper, turbulence and a current that curls, roots drawn as smooth curves, roots that each grow at a pace
of their own (the thickest first), multi-line setting, fonts that set as running text, video recording, and an embed for
any site.

## Credits and licences
- Code: the SG Rhizoma Engine (the scripts in `docs/index.html` and `docs/embed/`) adapts Rhizoma Engine v.01 by
  Dabin Kim, CC BY-SA 4.0, and is offered under the same licence. Credit Dabin Kim and Sativus Gourd where you use it.
- Fonts: SIL Open Font License 1.1. Latin from IM Fell English Roman by Igino Marini (Reserved Font Name
  "IM FELL English Roman"), Hangul from Song Myung by the Song Myung Project Authors.
- Interface fonts: Libre Caslon Text and Libre Franklin (OFL). Libraries: opentype.js, Paper.js, JSZip (MIT).
- Not covered: the Sativus Gourd name, signature and logo, the atelier artwork and the site's text are
  © 2026 Sativus Gourd and their respective owners. All rights reserved.

See LICENSE.md.
