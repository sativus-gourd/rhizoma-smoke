# Rhizoma Smoke

The SG Rhizoma Engine and Typeface Family by Sativus Gourd, led by SG Smoke and SG Roses. Built on [Rhizoma](https://github.com/dabinkiim/Rhizoma), the growing type system by Dabin Kim.

- Website: https://sativus-gourd.github.io/rhizoma-smoke/
- Guide: [GUIDE.md](GUIDE.md) covers the growth on a website, in After Effects and on video.

Type into the engine on the website and the letters grow. Each root grows at its own pace, the thickest first. You can bring any growth back from its seed, let it rise or fall through a text, save it as SVG, copy its embed code, record it as transparent PNG frames or video, and download the fonts. Leave the page open and it keeps growing.

## The SG Rhizoma Typeface Family

- Core: SG Smoke, SG Roses, SG Rhizoma V2
- Experimental: SG Drag, SG Flame, SG Tangle
- Variable: SG Smoke, SG Roses, SG Rhizoma V2, SG Drag and SG Flame, with a Growth axis from the bare letter (0) to the full growth (100; 140 in SG Roses) and a Weight axis (100 to 900)

## Fonts

The fonts to install are in `docs/downloads/`, and the web fonts are in `docs/webfonts/`. If you installed a beta (19.x), remove it first.

- The Latin comes from IM Fell English. Each letter has three looks that a run of text steps through, so a repeated letter changes shape; `font-feature-settings: "calt" 0` turns this off.
- Every face but SG Tangle carries Hangul: the 2,350 syllables of KS X 1001.
- SG Smoke and SG Roses carry the weights the site draws them at, 1.5 and 1.25 times the engine's base root width. On the Weight axis of the Variable fonts, 400 is that weight, 100 is half and 900 is double, in Latin and Hangul alike.
- SG Rhizoma V2 is grown with Dabin Kim's Rhizoma at default settings.

## Use it on your site

### Grow a heading

```html
<script src="https://sativus-gourd.github.io/rhizoma-smoke/embed/sg-rhizoma.js" defer></script>

<h1 data-sg-rhizoma="smoke">Cultivate your garden</h1>
```

The heading grows as it comes into view, with the site's engine and motion. Faces, seeds, growth, weight, fields that fill a screen, events, and recipes for React, Next.js, Vue, Nuxt, Svelte, Astro and Angular are in [GUIDE.md](GUIDE.md).

### Set text in the fonts

```html
<link rel="stylesheet" href="https://sativus-gourd.github.io/rhizoma-smoke/webfonts/sg-rhizoma.css">
<style>
  h1 { font-family: "SG Rhizoma Smoke Variable", serif; font-variation-settings: "GRWT" 60; }
</style>
```

## What the SG Rhizoma Engine adds to Rhizoma

- Hangul
- Seeds that bring a growth back
- Growth that rises or falls letter by letter
- Variable fonts with Growth and Weight axes
- Roots that start on the outline, join across letters and lines, and each grow at their own pace, the thickest first
- Drift, taper, turbulence and a current that curls
- Multi-line setting
- Transparent frames and video
- An embed for any site

## Credits and licences

- Code: the SG Rhizoma Engine adapts Rhizoma Engine v.01 by Dabin Kim, under CC BY-SA 4.0 like the original. Credit Dabin Kim and Sativus Gourd where you use it.
- Fonts: SIL Open Font License 1.1, with Reserved Font Names "SG Rhizoma", "SG Smoke" and "SG Roses". Latin from IM Fell English Roman by Igino Marini, Hangul from Song Myung. Credit Sativus Gourd where you can.
- Not covered: the Sativus Gourd name, signature, logo and artwork.

See [LICENSE.md](LICENSE.md).
