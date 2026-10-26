/*! SG Rhizoma Engine (embed) v19.15, by Sativus Gourd, 2026. https://github.com/sativus-gourd/rhizoma-smoke
 *  Built on Rhizoma Engine v.01 by Dabin Kim (https://github.com/dabinkiim/Rhizoma), CC BY-SA 4.0.
 *  This adaptation is offered under the same licence: https://creativecommons.org/licenses/by-sa/4.0/
 *  Credit Dabin Kim and Sativus Gourd where you use it, and share changes to this script under the same licence.
 *  Not covered: the Sativus Gourd name, signature and logo.
 *
 *  Use: <script src="https://sativus-gourd.github.io/rhizoma-smoke/embed/sg-rhizoma.js" defer></script>
 *       <h1 data-sg-rhizoma="smoke">Cultivate your garden</h1>
 *  Options as attributes: data-sg-rhizoma (smoke, roses, v2, drag, flame, tangle), data-seed, data-growth ("10" or "2-18"),
 *  data-colour, data-scale, data-replay (click to grow again). Or in script: SGRhizoma.grow(element, { face, seed, growth }).
 */
/* Rhizoma Lab
   An adaptation of Rhizoma Engine v.01 by Dabin Kim, licensed CC BY-SA 4.0.
   This adaptation is offered under the same licence.
   Changes from the original:
   - seeded random numbers, so a result can be regenerated exactly
   - geometry in em units (1000/em); SIZE no longer changes density or weight
   - optional drift: every root leans toward one angle
   - optional taper: roots thin toward the tip, branches start at the parent's local width
   - optional pruning box: roots stop when they leave it
   - any base font, including Hangul, glyph lookup through a font stack
   - growth per occurrence (every letter different) or frozen per character (a font)
   - variable-width outlines with round caps
   Requires opentype.js (global `opentype`) and paper.js (global `paper`). */
(function (global) {
  'use strict';
  const U = 1000;          // units per em
  const PX = 150;          // internal raster em, matches the original at SIZE 150
  const K = U / PX;        // units per original pixel

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  const DEFAULTS = {
    stage: 10, weight: 4.0, length: 1.5, chaos: 0.8, branch: 0.007,
    seed: 1,
    drift: null,        // { angle: degrees (0 right, -90 up), pull: 0..0.3 }
    taper: 0,           // 0 none, 1 roots end at a point
    minWidth: 0,        // floor on root width, units
    weightUnits: null,  // root width in units, overrides weight
    prune: null,        // { top, bottom, side } units: above baseline, below baseline, beyond the advance
    maxSteps: 300,
    simplify: 1.0,
    seedDensity: 1,     // multiplies the chance a sampled point starts a root
    chaosRamp: 0,       // chaos grows along each root (smoke: laminar, then turbulent)
    hangulDensity: 1,   // Hangul blocks carry far more ink than Latin letters; 0.45 evens the growth out
  };

  function opts(o) { return Object.assign({}, DEFAULTS, o || {}); }

  function findGlyph(fonts, ch) {
    for (const f of fonts) {
      const idx = f.charToGlyphIndex(ch);
      if (idx > 0) return { font: f, glyph: f.glyphs.get(idx), scale: U / f.unitsPerEm, ch };
    }
    return null;
  }

  // Sample seed points on the original's pixel grid. The original reads canvas alpha; this tests
  // pixel centres against the outline geometry, so a seed gives the same result in every browser.
  function gridPoints(info, o) {
    const st = (o.stage / 20) * 15;
    const adv = info.glyph.advanceWidth * info.scale / K;
    const w = Math.max(1, Math.ceil(adv * 1.6) + 40), h = Math.ceil(PX * 1.6);
    const ox = 20, base = PX * 1.1;
    const p2d = new Path2D(info.glyph.getPath(ox, base, PX).toPathData(3));
    const ctx = gridCtx();
    const strideBytes = Math.max(4, Math.floor(Math.max(10, 220 - st * 11)));
    const pts = [];
    for (let i = 0; i < w * h * 4; i += strideBytes) {
      const px = Math.floor(i / 4), x = px % w, y = Math.floor(px / w);
      if (ctx.isPointInPath(p2d, x + 0.5, y + 0.5, 'nonzero')) pts.push({ x: (x - ox) * K, y: (y - base) * K });
    }
    return pts;
  }
  let _gctx = null;
  function gridCtx() {
    if (!_gctx) { const c = document.createElement('canvas'); c.width = 4; c.height = 4; _gctx = c.getContext('2d'); }
    return _gctx;
  }
  function samplePoints(info, o, rng) {
    const st = (o.stage / 20) * 15;
    const hangul = info.ch && /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(info.ch);
    const pStart = (0.01 + st * 0.005) * o.seedDensity * (hangul ? o.hangulDensity : 1);
    return gridPoints(info, o).filter(() => rng() < pStart);
  }

  function makeRoot(rng, o, x, y, angle, pThick, birth) {
    const st = (o.stage / 20) * 15, ratio = st / 15, boost = 1 + 0.6 * ratio * ratio;
    return {
      segs: [{ x, y }], a: angle == null ? rng() * Math.PI * 2 : angle,
      thick: Math.max(0.5, pThick + (rng() * 0.15 - 0.10)),
      max: ((40 + rng() * 60) * (st / 8.5) * o.length * 1.2 * boost) * 0.6,
      done: false, birth: birth || 0, x, y, branchAt: null,
    };
  }

  // Grow roots for one glyph occurrence. Returns array of roots (segments in units, y down, baseline 0).
  function grow(info, o, seed) {
    const rng = mulberry32(seed);
    const st = (o.stage / 20) * 15;
    const roots = [];
    if (st <= 0) return roots;
    for (const p of samplePoints(info, o, rng)) roots.push(makeRoot(rng, o, p.x, p.y, null, 1.0, 0));
    const advU = info.glyph.advanceWidth * info.scale;
    const target = o.drift ? o.drift.angle * Math.PI / 180 : 0;
    let active = true, l = 0;
    while (active && l < o.maxSteps) {
      active = false; l++;
      for (let r = 0; r < roots.length; r++) {
        const R = roots[r];
        if (R.done) continue;
        if (R.segs.length > R.max) { R.done = true; continue; }
        active = true;
        const chaos = o.chaosRamp ? o.chaos * (1 + o.chaosRamp * R.segs.length / Math.max(R.max, 1)) : o.chaos;
        let a = R.a + (rng() - 0.5) * chaos;
        if (o.drift) a += o.drift.pull * Math.sin(target - a);
        R.a = a;
        const nx = R.x + Math.cos(a) * 2 * K, ny = R.y + Math.sin(a) * 2 * K;
        if (o.prune && (ny < -o.prune.top || ny > o.prune.bottom || nx < -o.prune.side || nx > advU + o.prune.side)) { R.done = true; continue; }
        R.x = nx; R.y = ny; R.segs.push({ x: nx, y: ny });
        if (rng() < o.branch && roots.length < st * 120) {
          const local = o.taper ? Math.max(0.2, 1 - o.taper * (R.segs.length / Math.max(R.max, 2))) : 1;
          const B = makeRoot(rng, o, nx, ny, a + (rng() - 0.5) * 2, R.thick * local, l);
          roots.push(B);
        }
      }
    }
    return roots;
  }

  function widthAt(o, R, i) {
    const base = o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * K;
    const n = R.segs.length;
    const t = o.taper ? 1 - o.taper * (i / Math.max(n - 1, 1)) : 1;
    return Math.max(o.minWidth, base * R.thick * Math.max(t, 0.02));
  }

  // Variable-width outline with round caps, as a polygon.
  function outline(o, R) {
    const s = R.segs, n = s.length;
    if (n < 2) return null;
    const L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const p0 = s[Math.max(0, i - 1)], p1 = s[Math.min(n - 1, i + 1)];
      let dx = p1.x - p0.x, dy = p1.y - p0.y; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const h = widthAt(o, R, i) / 2;
      L.push([s[i].x - dy * h, s[i].y + dx * h]); Rr.push([s[i].x + dy * h, s[i].y - dx * h]);
    }
    const cap = (p, q, h, from) => {
      const ang = Math.atan2(p.y - q.y, p.x - q.x), out = [];
      for (let k = 1; k < 8; k++) { const a = ang + from + Math.PI * k / 8; out.push([p.x + Math.cos(a) * h, p.y + Math.sin(a) * h]); }
      return out;
    };
    const end = cap(s[n - 1], s[n - 2], widthAt(o, R, n - 1) / 2, -Math.PI / 2);
    const start = cap(s[0], s[1], widthAt(o, R, 0) / 2, -Math.PI / 2);
    return [...Rr, ...end, ...L.reverse(), ...start];
  }

  let paperReady = false;
  function ensurePaper() {
    if (paperReady) return;
    const c = document.createElement('canvas'); c.width = 10; c.height = 10;
    paper.setup(c); paperReady = true;
  }

  // Union of base glyph and roots for one occurrence, at (x, 0). Returns paper item (not inserted).
  function glyphShape(info, o, seed, x) {
    ensurePaper();
    const gp = info.glyph.getPath(x, 0, U);
    const base = new paper.CompoundPath(gp.toPathData(2));
    const roots = grow(info, o, seed);
    if (!roots.length) return { item: base, roots };
    const rp = new paper.CompoundPath();
    for (const R of roots) {
      const pts = outline(o, R);
      if (!pts) continue;
      const shifted = pts.map(([px, py]) => [px + x, py]);
      const path = new paper.Path({ segments: shifted, closed: true, insert: false });
      if (o.simplify) path.simplify(o.simplify);
      rp.addChild(path);
    }
    const u = base.unite(rp, { insert: false });
    if (o.simplify) u.simplify(o.simplify);
    base.remove(); rp.remove();
    return { item: u, roots };
  }

  // Lay out a line of text. mode 'live' grows each occurrence separately; 'frozen' grows per character.
  function layout(fonts, text, o, mode) {
    o = opts(o);
    const items = []; let x = 0; let prev = null;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const info = findGlyph(fonts, ch);
      if (!info) { prev = null; continue; }
      if (prev && prev.font === info.font) x += info.font.getKerningValue(prev.glyph, info.glyph) * info.scale;
      const adv = info.glyph.advanceWidth * info.scale;
      if (ch.trim() === '') { x += adv + (o.tracking || 0); prev = info; continue; }
      const seed = mode === 'frozen' ? hash2(o.seed, ch.codePointAt(0)) : hash2(o.seed, i + 1);
      const { item, roots } = glyphShape(info, o, seed, x);
      items.push({ ch, x, adv, d: item.pathData, bounds: item.bounds, roots: roots.map(R => ({ segs: R.segs.map(s => ({ x: s.x + x, y: s.y })), thick: R.thick, birth: R.birth })) });
      item.remove();
      x += adv + (o.tracking || 0); prev = info;
    }
    let b = null;
    for (const it of items) {
      const r = it.bounds; if (!r) continue;
      b = b ? { x0: Math.min(b.x0, r.x), y0: Math.min(b.y0, r.y), x1: Math.max(b.x1, r.x + r.width), y1: Math.max(b.y1, r.y + r.height) } : { x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height };
    }
    return { items, advance: x, bounds: b };
  }

  // Build an OTF of a character set with frozen growth. Returns ArrayBuffer.
  function buildFont(fonts, charset, o, familyName, styleName) {
    o = opts(o); ensurePaper();
    const glyphs = [new opentype.Glyph({ name: '.notdef', advanceWidth: 600, path: new opentype.Path() })];
    const seen = new Set();
    for (const ch of charset) {
      if (seen.has(ch)) continue; seen.add(ch);
      const info = findGlyph(fonts, ch); if (!info) continue;
      const adv = Math.round(info.glyph.advanceWidth * info.scale);
      const name = info.glyph.name || ('uni' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
      if (ch.trim() === '') { glyphs.push(new opentype.Glyph({ name: ch === ' ' ? 'space' : name, unicode: ch.codePointAt(0), advanceWidth: adv, path: new opentype.Path() })); continue; }
      const { item } = glyphShape(info, o, hash2(o.seed, ch.codePointAt(0)), 0);
      const op = new opentype.Path();
      const kids = item.className === 'CompoundPath' ? item.children : [item];
      for (const k of kids) {
        if (!k.segments.length) continue;
        const s0 = k.segments[0].point; op.moveTo(s0.x, -s0.y);
        for (const c of k.curves) {
          const h1 = c.point1.add(c.handle1), h2 = c.point2.add(c.handle2);
          op.bezierCurveTo(h1.x, -h1.y, h2.x, -h2.y, c.point2.x, -c.point2.y);
        }
        op.closePath();
      }
      item.remove();
      glyphs.push(new opentype.Glyph({ name, unicode: ch.codePointAt(0), advanceWidth: adv, path: op }));
    }
    const font = new opentype.Font({ familyName, styleName: styleName || 'Regular', unitsPerEm: U, ascender: 800, descender: -200, glyphs });
    return font.toArrayBuffer();
  }

  // For diagrams: every inside point the sampler visits, before the sprout test.
  function candidates(info, o) { return gridPoints(info, opts(o)); }

  global.RhizomaLab = { DEFAULTS, opts, layout, buildFont, grow, findGlyph, widthAt, outline, hash2, mulberry32, candidates, glyphShape, U, K };
})(typeof window !== 'undefined' ? window : globalThis);

/* Rhizoma Smoke engine, Sativus Gourd
   An adaptation of Rhizoma Engine v.01 by Dabin Kim (github.com/dabinkiim/Rhizoma), licensed CC BY-SA 4.0.
   This adaptation is offered under the same licence.

   Kept from the original: letters are sampled on the original's pixel stride, a sampled point sprouts
   with the original's chance per growth stage, roots walk in fixed steps, turn by a random angle and
   branch with a fixed chance, and roots are united with the letter before a font is written.

   Added here: seeds; em units; whole scenes grown together so roots from different letters and lines
   can meet and fuse; seeds on the outline that leave along its outward normal; drift, taper, curl,
   turbulence and flame branching; a seeded flow field for SG Drag; ignition that spreads letter to
   letter for SG Smoke Wildfire; char channels burnt into the letter; Hangul through a font stack;
   multi-line layout; growth that rises or falls letter by letter through a text. Requires opentype.js (global `opentype`); paper.js only for united SVG and fonts. */
(function (global) {
  'use strict';
  const U = 1000, PX = 150, K = U / PX;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  const DEFAULTS = {
    stage: 10, weight: 4.0, weightUnits: null, length: 1.5, chaos: 0.8, branch: 0.007,
    seed: 1, taper: 0, taperPow: 1, minWidth: 0,
    seedFrom: 'fill',      // 'fill' (original), 'edge' (outline, leaves along the normal) or 'both'
    edgeSpacing: 30,       // units between outline samples
    edgeBoost: 1,          // sprout chance multiplier for outline samples
    emerge: 0,             // 0..1: how closely the first heading follows the outward normal
    facing: null,          // { angle, spread } degrees: only outline points facing this way sprout
    seedDensity: 1, hangulDensity: 1,
    drift: null,           // { angle, pull } every root leans toward one angle
    chaosRamp: 0,          // turbulence grows along each root
    curl: 0, curlRamp: 0,  // turning per step, sign chosen per root; curlRamp > 0 holds it back until the tip (twirl)
    branchRamp: 0,         // branching grows along each root (flame)
    flow: null,            // { scale, strength, turns } seeded field: roots are carried by it (SG Drag)
    connect: 0,            // fusion radius in units; 0 = off
    connectSelf: false,    // roots may also fuse with other roots of the same letter
    fuseAge: 8,            // steps before a root may fuse
    seek: 0, sense: 0,     // steer toward foreign growth within `sense` units
    ignite: null,          // { speed, jitter } letters catch one after another (wildfire)
    char: null,            // { density, weightUnits, length } channels burnt into the letter
    prune: null,           // { top, bottom, side } units around each letter; soft (units), pull, jitter and loop (share that turn back) make the edge ragged
    smooth: 0,             // passes of a 1-2-1 filter over each root before it is drawn: one continuous curve instead of short straight steps
    fillet: null,          // { amp, tau } a trunk thickens where it leaves the letter and eases back over tau steps
    hangulGuard: null,     // { side, tick, straight } after growth, drop Hangul roots that would read as a stroke
    growth: null,          // { from, to } on Rhizoma's growth-stage scale (0 to 20, 10 = the face as tuned): growth rises or falls letter by letter
                           // growth.scale [below, above]: how far this face moves per step of growth either side of 10
    inset: 0,              // an outline root starts this many base half-widths inside its letter, so its round end stays in the stroke
    hold: 0,               // steps over which an outline root's turning eases in: it leaves its letter before it wanders
    bend: 0,               // a root is drawn no wider than this many times its radius of turning (no knots where it turns tight)
    twirl: null,           // { p, turns, r0, r1, min } now and then a root curls on itself, a spiral from radius r0 to r1 (SG Drag)
    minContour: 0,         // no outline roots from contours smaller than this (units): the dot of an i stays a dot
    stagger: 0,            // the roots of a letter come up over this many steps instead of all at once
    branchFit: 0,          // a parent is drawn at least this share of the width of each branch it carries, up to where it leaves (0 = off)
    branchFitEase: 3,      // then eases back to its own width over this many steps
    maxSteps: 300,
    simplify: 1.0,
    lineHeight: 1.3, align: 'left', tracking: 0,
  };
  function opts(o) { return Object.assign({}, DEFAULTS, o || {}); }

  const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
  function findGlyph(fonts, ch) {
    for (const f of fonts) {
      const idx = f.charToGlyphIndex(ch);
      if (idx > 0) return { font: f, glyph: f.glyphs.get(idx), scale: U / f.unitsPerEm, ch };
    }
    return null;
  }
  function glyphByName(font, name, ch) {
    for (let i = 0; i < font.glyphs.length; i++) { const g = font.glyphs.get(i); if (g.name === name) return { font, glyph: g, scale: U / font.unitsPerEm, ch: ch || '' }; }
    return null;
  }

  let _ctx = null;
  function ctx2d() { if (!_ctx) { const c = document.createElement('canvas'); c.width = 4; c.height = 4; _ctx = c.getContext('2d'); } return _ctx; }

  // ---------- geometry of one letter
  function flatten(cmds) {
    const contours = []; let cur = null, px = 0, py = 0, sx = 0, sy = 0;
    for (const c of cmds) {
      if (c.type === 'M') { cur = [[c.x, c.y]]; contours.push(cur); px = sx = c.x; py = sy = c.y; }
      else if (c.type === 'L') { cur.push([c.x, c.y]); px = c.x; py = c.y; }
      else if (c.type === 'Q') { for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; cur.push([u * u * px + 2 * u * t * c.x1 + t * t * c.x, u * u * py + 2 * u * t * c.y1 + t * t * c.y]); } px = c.x; py = c.y; }
      else if (c.type === 'C') { for (let i = 1; i <= 10; i++) { const t = i / 10, u = 1 - t; cur.push([u * u * u * px + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x, u * u * u * py + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y]); } px = c.x; py = c.y; }
      else if (c.type === 'Z') { if (cur) cur.push([sx, sy]); px = sx; py = sy; }
    }
    return contours.filter(c => c.length > 2);
  }

  // letter geometry at the origin (units, y down, baseline 0)
  function letter(info) {
    if (info._geo) return info._geo;
    const path = info.glyph.getPath(0, 0, U);
    const p2d = new Path2D(path.toPathData(2));
    const bb = path.getBoundingBox();
    info._geo = { path, p2d, bb, contours: flatten(path.commands) };
    return info._geo;
  }
  function inside(geo, x, y) { return ctx2d().isPointInPath(geo.p2d, x, y, 'nonzero'); }

  // the original's raster stride, kept: a skewed lattice over a virtual canvas
  function fillPoints(info, o) {
    const st = (o.stage / 20) * 15;
    const geo = letter(info);
    const adv = info.glyph.advanceWidth * info.scale / K;
    const w = Math.max(1, Math.ceil(adv * 1.6) + 40), h = Math.ceil(PX * 1.6);
    const ox = 20, base = PX * 1.1;
    const stride = Math.max(4, Math.floor(Math.max(10, 220 - st * 11)));
    const pts = [];
    for (let i = 0; i < w * h * 4; i += stride) {
      const px = Math.floor(i / 4), x = ((px % w) + 0.5 - ox) * K, y = (Math.floor(px / w) + 0.5 - base) * K;
      if (inside(geo, x, y)) pts.push({ x, y, edge: false });
    }
    return pts;
  }
  function edgePoints(info, o) {
    const geo = letter(info); const pts = []; const sp = o.edgeSpacing;
    for (const c of geo.contours) {
      if (o.minContour) { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of c) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } if (Math.max(x1 - x0, y1 - y0) < o.minContour) continue; }
      let carry = sp * 0.5;
      for (let i = 1; i < c.length; i++) {
        const [x0, y0] = c[i - 1], [x1, y1] = c[i];
        const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 1e-6) continue;
        let d = carry;
        while (d <= L) {
          const t = d / L, x = x0 + dx * t, y = y0 + dy * t;
          let nx = -dy / L, ny = dx / L;
          if (inside(geo, x + nx * 4, y + ny * 4)) { nx = -nx; ny = -ny; }
          pts.push({ x, y, nx, ny, edge: true });
          d += sp;
        }
        carry = d - L;
      }
    }
    return pts;
  }

  // ---------- seeded value noise for the flow field
  function noise(seed) {
    const v = (ix, iy) => hash2(hash2(seed, ix), iy) / 4294967296;
    const s = t => t * t * (3 - 2 * t);
    return (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y), fx = s(x - ix), fy = s(y - iy);
      const a = v(ix, iy), b = v(ix + 1, iy), c = v(ix, iy + 1), d = v(ix + 1, iy + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }

  // ---------- spatial hash
  function Grid(cell) { this.cell = cell; this.m = new Map(); }
  Grid.prototype.key = function (cx, cy) { return cx * 73856093 ^ cy * 19349663; };
  Grid.prototype.add = function (it) {
    const k = this.key(Math.floor(it.x / this.cell), Math.floor(it.y / this.cell));
    let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push(it);
  };
  Grid.prototype.near = function (x, y, r, ok) {
    const c = this.cell, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    let best = null, bd = r * r;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.m.get(this.key(cx, cy)); if (!a) continue;
      for (const it of a) { const dx = it.x - x, dy = it.y - y, d = dx * dx + dy * dy; if (d < bd && ok(it)) { bd = d; best = it; } }
    }
    return best;
  }

  // ---------- layout
  function layout(fonts, text, o) {
    o = opts(o);
    const lines = String(text).split('\n');
    const insts = []; const lineW = [];
    let idx = 0;
    lines.forEach((line, li) => {
      let x = 0, prev = null; const y = li * o.lineHeight * U; const row = [];
      for (const ch of Array.from(line)) {
        idx++;
        const info = findGlyph(fonts, ch);
        if (!info) { prev = null; continue; }
        if (prev && prev.font === info.font) x += info.font.getKerningValue(prev.glyph, info.glyph) * info.scale;
        const adv = info.glyph.advanceWidth * info.scale;
        if (ch.trim() !== '') row.push({ info, x, y, adv, index: idx, line: li });
        x += adv + o.tracking; prev = info;
      }
      lineW.push(x); insts.push(...row);
    });
    if (o.align === 'center') {
      const wmax = Math.max(...lineW, 0);
      for (const it of insts) it.x += (wmax - lineW[it.line]) / 2;
    }
    return { insts, lines: lines.length, lineW };
  }

  // ---------- growth along the text
  // Letter k of n grows at from + (to - from) * k / (n - 1). Each step moves the growth stage by one (kept within
  // Rhizoma's 0 to 20) and the line weight by 4%, so 10 is the face as tuned, 0 is bare and 20 is overgrown.
  function growthAt(g, k, n) { const v = g.from + (g.to - g.from) * (n > 1 ? k / (n - 1) : 0), sc = g.scale; return sc ? 10 + (v - 10) * (v < 10 ? sc[0] : sc[1]) : v; }
  function grownOpts(o, gv) { return opts(Object.assign({}, o, { stage: Math.min(20, Math.max(0, o.stage + gv - 10)) })); }
  function weightFor(gv, g) { const w = g && g.scale && g.scale[2] != null && gv > 10 ? 10 + (gv - 10) * g.scale[2] : gv; return 0.6 + 0.04 * w; }

  // ---------- growth
  function makeRoot(rng, o, x, y, a, thick, birth, lineage, inst) {
    const st = (o.stage / 20) * 15, ratio = st / 15, boost = 1 + 0.6 * ratio * ratio;
    return { segs: [{ x, y }], a, thick: Math.max(0.5, thick + (rng() * 0.15 - 0.10)),
      max: ((40 + rng() * 60) * (st / 8.5) * o.length * 1.2 * boost) * 0.6,
      done: false, birth, lineage, inst, x, y, spin: rng() < 0.5 ? -1 : 1, fused: false, burn: false };
  }

  function seedInstance(inst, o, rng, birth, lin) {
    const info = inst.info; const st = (o.stage / 20) * 15; const roots = [];
    if (st <= 0) return roots;
    const hang = HANGUL.test(info.ch) ? o.hangulDensity : 1;
    const p = (0.01 + st * 0.005) * o.seedDensity * hang;
    let pts = [];
    if (o.seedFrom === 'fill' || o.seedFrom === 'both') pts = pts.concat(fillPoints(info, o));
    if (o.seedFrom === 'edge' || o.seedFrom === 'both') pts = pts.concat(edgePoints(info, o));
    const fa = o.facing ? o.facing.angle * Math.PI / 180 : 0, fs = o.facing ? Math.cos(o.facing.spread * Math.PI / 180) : -2;
    for (const q of pts) {
      const chance = q.edge ? p * o.edgeBoost : p;
      if (rng() >= chance) continue;
      if (q.edge && o.facing && (q.nx * Math.cos(fa) + q.ny * Math.sin(fa)) < fs) continue;
      let a = rng() * Math.PI * 2;
      if (q.edge && o.emerge > 0) { const na = Math.atan2(q.ny, q.nx); a = na + (rng() - 0.5) * Math.PI * 2 * (1 - o.emerge); }
      let sx = q.x, sy = q.y;
      if (q.edge && o.inset) { const d = o.inset * (o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * K) * (inst.wmul || 1) / 2; sx -= q.nx * d; sy -= q.ny * d; }
      const R = makeRoot(rng, o, inst.x + sx, inst.y + sy, a, 1.0, birth + (o.stagger ? Math.floor(Math.pow(rng(), 1.6) * o.stagger) : 0), lin.next++, inst);
      if (inst.wmul) R.thick *= inst.wmul;
      if (q.edge) R.edge = true;
      roots.push(R);
    }
    if (o.char) {
      const cpts = fillPoints(info, o);
      for (const q of cpts) {
        if (rng() >= p * o.char.density) continue;
        const R = makeRoot(rng, opts(Object.assign({}, o, { length: o.char.length || o.length })), inst.x + q.x, inst.y + q.y, rng() * Math.PI * 2, 1.0, birth, lin.next++, inst);
        if (inst.wmul) R.thick *= inst.wmul;
        R.burn = true; roots.push(R);
      }
    }
    return roots;
  }

  // Hangul guard, after growth so every other root keeps its place. A trunk with its branches is dropped when it
  // leaves the syllable sideways (the tick of ㅏ ㅓ ㅑ ㅕ) or when all of it outside the letter is short and straight
  // (ㅡ to ㅗ ㅜ, ㅈ to ㅊ). Latin is untouched.
  function guardHangul(o, roots) {
    const G = o.hangulGuard; if (!G) return roots;
    const byLin = new Map();
    for (const R of roots) { if (R.burn || !HANGUL.test(R.inst.info.ch || '')) continue; if (!byLin.has(R.lineage)) byLin.set(R.lineage, []); byLin.get(R.lineage).push(R); }
    for (const list of byLin.values()) {
      const trunk = list.reduce((a, b) => (b.birth < a.birth ? b : a));
      const s = trunk.segs, n = s.length; if (n < 2) continue;
      const geo = letter(trunk.inst.info), ix = trunk.inst.x, iy = trunk.inst.y;
      const inP = (x, y) => inside(geo, x - ix, y - iy);
      let k = 0; while (k < n - 1 && inP(s[k].x, s[k].y)) k++;
      const e = s[Math.min(k + 5, n - 1)], dx = e.x - s[k].x, dy = e.y - s[k].y;
      const ang = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI), fromH = Math.min(ang, 180 - ang);
      let vis = 0;
      for (const R of list) for (let i = 1; i < R.segs.length; i++) { const a = R.segs[i - 1], b = R.segs[i]; if (!inP((a.x + b.x) / 2, (a.y + b.y) / 2)) vis += Math.hypot(b.x - a.x, b.y - a.y); }
      let arc = 0; for (let i = k + 1; i < n; i++) arc += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
      const chord = n - 1 > k ? Math.hypot(s[n - 1].x - s[k].x, s[n - 1].y - s[k].y) : 0;
      const side = G.side != null && fromH < G.side && Math.hypot(dx, dy) > 4;
      const tick = G.tick != null && vis < G.tick && (arc === 0 || chord / arc > (G.straight || 0.85));
      if (side || tick) for (const R of list) R.cut = true;
    }
    return roots.filter(R => !R.cut);
  }

  // the roots of one plant as they stood at a share t of each letter's own growth (by letter): later roots left out,
  // the rest cut where their tip was; a root cut before it joined another no longer counts as joined
  function earlierBy(roots, shareOf) {
    const tEnd = new Map();
    for (const R of roots) tEnd.set(R.inst.id, Math.max(tEnd.get(R.inst.id) || 1, R.birth + R.segs.length));
    const out = [];
    for (const R of roots) {
      const t = shareOf(R.inst.id); if (t >= 1) { out.push(R); continue; }
      const T = Math.max(0, t) * tEnd.get(R.inst.id), n = Math.min(R.segs.length, Math.floor(T - R.birth) + 1);
      if (n < 2) continue;
      if (n < R.segs.length) { R.segs = R.segs.slice(0, n); R.fused = false; R.done = true; }
      out.push(R);
    }
    return out;
  }
  // the roots as far as each stays inside its letter's box (prune), opened by a margin for that letter: a root ends where it
  // first leaves it, and a branch whose fork is cut away goes with it
  function boundBy(roots, P, marginOf) {
    const out = [], kept = new Map();
    for (const R of roots.slice().sort((a, b) => a.birth - b.birth)) {
      if (R.parent) { const n = kept.get(R.parent); if (n == null || n <= R.at) continue; }
      const m = marginOf(R.inst.id), j = P.soft ? (R.pj || 1) : 1, adv = R.inst.adv;
      let n = R.segs.length;
      for (let i = 1; i < R.segs.length; i++) {
        const lx = R.segs[i].x - R.inst.x, ly = R.segs[i].y - R.inst.y;
        if (ly < -P.top * j - m || ly > P.bottom * j + m || lx < -P.side * j - m || lx > adv + P.side * j + m) { n = i; break; }
      }
      if (n < 2) continue;
      if (n < R.segs.length) { R.segs = R.segs.slice(0, n); R.fused = false; R.done = true; }
      kept.set(R, n); out.push(R);
    }
    return out;
  }
  function cumulate(sc, o, G, gvs, lin) {
    const insts = sc.insts;
    let roots = earlierBy(sc.roots, id => gvs[id] < 10 ? Math.pow(gvs[id] / 10, 1.5) : 1);
    const top = 10 + 10 * (G.scale ? G.scale[1] : 1), up = insts.filter((it, k) => gvs[k] > 10);
    if (up.length && top > 10) {
      const ox = opts(Object.assign({}, o, { stage: Math.min(20, o.stage + top - 10), maxSteps: Math.round(o.maxSteps * (1 + (top - 10) / 10)) }));
      // above 10 the letter's bounds open (SG Roses, SG Tangle): this plant grows out to the face's own limit, and below the
      // top of the range each letter keeps its roots only up to where they leave a box around it that widens with growth
      // (600 units out by the middle of the range, then fast), so a step up keeps every root of the step below, longer
      const free = G.scale && G.scale[3] && o.prune ? G.scale[3] : 0;
      if (free) for (const it of up) it.reach = free;
      let xr = []; const l2 = { next: lin.next + 100000 };
      for (const it of up) { it.rng = mulberry32(hash2(hash2(o.seed, it.index), 0x51ED)); xr = xr.concat(seedInstance(it, ox, it.rng, it.ignite, l2)); }
      const sx = { insts, roots: xr, joints: [] };
      runLoop(sx, ox, ox.maxSteps + (o.stagger || 0) + Math.max(0, ...insts.map(i => i.ignite)), roots);
      if (o.hangulGuard) sx.roots = guardHangul(ox, sx.roots);
      if (free) for (const it of up) delete it.reach;
      const share = id => Math.min(1, (gvs[id] - 10) / (top - 10)), keep = new Set(); let t = 0;
      for (const R of sx.roots.slice().sort((a, b) => a.birth - b.birth)) {
        if (R.parent) { if (keep.has(R.parent)) keep.add(R); continue; }
        if ((hash2(hash2(o.seed, R.inst.index + 7), t++) >>> 0) / 4294967296 < share(R.inst.id)) keep.add(R);
      }
      let extra = earlierBy(sx.roots.filter(R => keep.has(R)), share);
      if (free) extra = boundBy(extra, o.prune, id => { const s = share(id); return s >= 1 ? free : Math.min(free, 600 * s / (1 - s)); });
      for (const R of extra) R.birth += 20;                                // they come up a little after the first plant
      roots = roots.concat(extra);
    }
    // keep the drawing honest: branches only on roots still drawn, a join only where something is drawn to join
    const kept = new Set(roots), pts = new Map(), key = p => Math.round(p.x * 64) + ',' + Math.round(p.y * 64);
    for (const R of roots) { if (R._kids) R._kids = R._kids.filter(C => kept.has(C) && C.at < R.segs.length); R.segs.forEach(p => { const k = key(p); pts.set(k, (pts.get(k) || 0) + 1); }); }
    sc.joints = [];
    for (const R of roots) if (R.fused) {
      const e = R.segs[R.segs.length - 1];
      let ok = false;
      for (const q of insts) if (inside(letter(q.info), e.x - q.x, e.y - q.y)) { ok = true; break; }
      if (!ok) ok = (pts.get(key(e)) || 0) > 1;                          // the point it joined is on another drawn root
      if (ok) sc.joints.push({ x: e.x, y: e.y, t: R.birth + R.segs.length - 1 }); else R.fused = false;
    }
    insts.forEach((it, k) => { it.wmul = weightFor(gvs[k], G); });
    sc.roots = roots;
  }
  function grow(fonts, text, o) {
    o = opts(o);
    const lay = layout(fonts, text, o);
    const insts = lay.insts;
    insts.forEach((it, k) => { it.rng = mulberry32(hash2(o.seed, it.index)); it.id = k; it.ignite = 0; });
    // growth adds up on one plant: every letter grows its plant at growth 10 (the face as tuned, untouched); below 10 the
    // letter shows that plant earlier in its growth, above 10 it gains roots from a second, denser plant, picked in a fixed
    // order, so each step keeps every root of the step below. Line weight follows growth as before.
    const G = o.growth, gvs = G ? insts.map((it, k) => growthAt(G, k, insts.length)) : null;
    if (G) o = opts(Object.assign({}, o, { growth: null }));
    // ignition times (wildfire): spreads from one letter through the nearest others
    if (o.ignite && insts.length) {
      const r0 = mulberry32(hash2(o.seed, 77777));
      const start = Math.floor(r0() * insts.length);
      const cen = insts.map(it => { const bb = letter(it.info).bb; return { x: it.x + (bb.x1 + bb.x2) / 2, y: it.y + (bb.y1 + bb.y2) / 2 }; });
      const T = insts.map(() => Infinity); T[start] = 0; const done = insts.map(() => false);
      for (let n = 0; n < insts.length; n++) {
        let u = -1; for (let i = 0; i < insts.length; i++) if (!done[i] && (u < 0 || T[i] < T[u])) u = i;
        if (u < 0 || !isFinite(T[u])) break; done[u] = true;
        for (let v = 0; v < insts.length; v++) {
          if (done[v]) continue;
          const d = Math.hypot(cen[u].x - cen[v].x, cen[u].y - cen[v].y);
          const t = T[u] + d / o.ignite.speed + r0() * o.ignite.jitter;
          if (t < T[v]) T[v] = t;
        }
      }
      insts.forEach((it, i) => { it.ignite = Math.round(T[i]); });
    }
    const lin = { next: 0 };
    let roots = [];
    for (const it of insts) roots = roots.concat(seedInstance(it, it.o || o, it.rng, it.ignite, lin));
    const sc = { insts, roots, joints: [] };
    const gmax = o.growth ? Math.max(...insts.map((it, k) => growthAt(o.growth, k, insts.length))) : 10;
    runLoop(sc, o, Math.round((o.maxSteps + (o.stagger || 0)) * (1 + Math.max(0, gmax - 10) / 10)) + Math.max(0, ...insts.map(i => i.ignite)));
    if (o.hangulGuard) sc.roots = guardHangul(o, sc.roots);
    if (G) { cumulate(sc, o, G, gvs, lin); o = opts(Object.assign({}, o, { growth: G })); }
    roots = sc.roots; const joints = sc.joints;
    let total = 0;
    for (const R of roots) total = Math.max(total, R.birth + R.segs.length);
    // bounds
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const it of insts) { const bb = letter(it.info).bb; b.x0 = Math.min(b.x0, it.x + bb.x1); b.x1 = Math.max(b.x1, it.x + bb.x2); b.y0 = Math.min(b.y0, it.y + bb.y1); b.y1 = Math.max(b.y1, it.y + bb.y2); }
    const wmax = widthAt(o, { thick: o.growth ? 1.6 * 1.4 : 1.6 }, 0, 2);
    for (const R of roots) for (const p of R.segs) { if (p.x - wmax < b.x0) b.x0 = p.x - wmax; if (p.x + wmax > b.x1) b.x1 = p.x + wmax; if (p.y - wmax < b.y0) b.y0 = p.y - wmax; if (p.y + wmax > b.y1) b.y1 = p.y + wmax; }
    if (!isFinite(b.x0)) { b.x0 = 0; b.y0 = -800; b.x1 = 1000; b.y1 = 200; }
    return { o, insts, roots, joints, total, b, nRoots: roots.length };
  }

  function widthAt(o, R, i, n) {
    const base = o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * K;
    const s = Math.min(1, i / Math.max(n - 1, 1));                     // n can be part way through a step (outline)
    const t = o.taper ? 1 - o.taper * Math.pow(s, o.taperPow) : 1;
    return Math.max(o.minWidth, base * R.thick * Math.max(t, 0.02));
  }
  function charWidth(o, R, i, n) {
    const base = o.char && o.char.weightUnits || 24; const s = Math.min(1, i / Math.max(n - 1, 1));
    return Math.max(4, base * R.thick * (1 - 0.6 * s));
  }

  // variable-width outline with round caps; nVis limits the visible length (animation)
  // the drawn path of a root: its steps, or the steps smoothed (endpoints stay where they grew)
  function pathOf(o, R) {
    const s = R.segs;
    if (!o.smooth || s.length < 3) return s;
    if (R._sm && R._smN === s.length && R._smK === o.smooth) return R._sm;
    let p = s.map(q => ({ x: q.x, y: q.y })), pre = 0;
    // a root that joined another snapped its last step onto it, up to two steps sideways; drawn, it bends there over its
    // last steps, so it meets the other root in a curve with no hook or knob where it lands. Growth is unchanged.
    if (R.fused && p.length >= 4) {
      const n = p.length, a = p[n - 3], b = p[n - 2], L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ex = { x: b.x + (b.x - a.x) / L * 2 * K, y: b.y + (b.y - a.y) / L * 2 * K }, dx = p[n - 1].x - ex.x, dy = p[n - 1].y - ex.y;
      const N = Math.min(n - 2, 6);
      for (let k = 1; k <= N; k++) { const i = n - 1 - N + k - 1, u = k / (N + 1), w = u * u * (3 - 2 * u); p[i].x += dx * w; p[i].y += dy * w; }
    }
    // a root that starts near the edge of its letter would show its round start as a knob beside the stroke (at a thin
    // serif or corner the round end is wider than the inset); drawn, it starts from the nearest place in the stroke deep
    // enough to hide that round end, preferring the way it came from, so it reads as leaving the letter. Growth is unchanged.
    if (!R.burn && R.inst && R.inst.info && p.length >= 2) {
      const geo = letter(R.inst.info), ix = R.inst.x, iy = R.inst.y, a = p[0], b = p[1];
      const base = o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * K, r = base * R.thick * (1 + (o.fillet ? o.fillet.amp : 0)) * (R.inst.wmul || 1) * 0.5;
      const deep = (x, y, h) => inside(geo, x - ix, y - iy) && inside(geo, x + h - ix, y - iy) && inside(geo, x - h - ix, y - iy) && inside(geo, x - ix, y + h - iy) && inside(geo, x - ix, y - h - iy);
      if (!deep(a.x, a.y, r * 0.7)) {
        const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (a.x - b.x) / L, uy = (a.y - b.y) / L;
        let best = null, bs = Infinity;
        for (let d = K; d <= 3 * r + 1e-6; d += K) for (let j = 0; j < 16; j++) {
          const t = j / 16 * Math.PI * 2, cx = Math.cos(t), cy = Math.sin(t), x = a.x + cx * d, y = a.y + cy * d;
          const sc = d * (1 + 0.6 * (1 - (cx * ux + cy * uy)));       // nearest, and the way it came from
          if (sc < bs && deep(x, y, r * 0.7)) { bs = sc; best = { x, y }; }
        }
        if (best) { p.unshift(best, { x: (best.x + a.x) / 2, y: (best.y + a.y) / 2 }); pre = 2; }
      }
    }
    for (let k = 0; k < o.smooth; k++) {
      const q = p.map(a => ({ x: a.x, y: a.y }));
      for (let i = 1; i < p.length - 1; i++) { q[i].x = (p[i - 1].x + 2 * p[i].x + p[i + 1].x) / 4; q[i].y = (p[i - 1].y + 2 * p[i].y + p[i + 1].y) / 4; }
      p = q;
    }
    R._sm = p; R._smN = s.length; R._smK = o.smooth; R._pre = pre;
    return p;
  }
  // where a trunk leaves its letter (-1: never, or not a trunk)
  function exitIndex(o, R, s) {
    if (!o.fillet || R.burn || R.birth > (R.inst.ignite || 0)) return -1;
    if (R._fk != null && R._fkN === s.length) return R._fk;
    const geo = letter(R.inst.info), ix = R.inst.x, iy = R.inst.y;
    let k = -1, was = inside(geo, s[0].x - ix, s[0].y - iy);
    if (!was) k = 0;
    else for (let i = 1; i < s.length; i++) { const now = inside(geo, s[i].x - ix, s[i].y - iy); if (was && !now) { k = i; break; } was = now; }
    R._fk = k; R._fkN = s.length;
    return k;
  }
  // the width outline() gives step i of n, before the minimum width and the branch fit
  function rawWidth(o, R, i, n, s) {
    const base = o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * K;
    const sN = Math.min(1, i / Math.max(n - 1, 1)), t = o.taper ? 1 - o.taper * Math.pow(sN, o.taperPow) : 1, k = exitIndex(o, R, s);
    const f = k < 0 ? 1 : (i < k ? 1 + o.fillet.amp : 1 + o.fillet.amp * Math.exp(-(i - k) / o.fillet.tau));
    return base * R.thick * Math.max(t, 0.02) * f;
  }
  // a parent is drawn at least branchFit times as wide as each branch it carries, up to the step the branch leaves it,
  // then eases back to its own width over branchFitEase steps; branches keep their own width. So no thick root sprouts
  // from a thin one and no branch thins to a thread. Drawn only: growth is unchanged. While a root grows, a branch counts
  // once the parent has reached the step it leaves from.
  function carryAt(o, R, i, nVis) {
    if (!o.branchFit || !R._kids || R.burn) return 0;
    let w = 0; const E = Math.max(1, o.branchFitEase);
    for (const C of R._kids) {
      if (C.burn || (nVis != null && C.at + (R._pre || 0) > nVis - 1)) continue;
      const d = i - C.at - (R._pre || 0); if (d >= E) continue;
      const u = d / E, f = d <= 0 ? 1 : 1 - u * u * (3 - 2 * u), r = o.branchFit * startWidth(o, C) * f;
      if (r > w) w = r;
    }
    return w;
  }
  // a branch's starting width depends only on the branch, so it is worked out once (a parent asks for it at every point)
  function startWidth(o, C) {
    if (C._swO === o && C._swN === C.segs.length) return C._sw;
    const sC = pathOf(o, C), w = Math.max(rawWidth(o, C, 0, sC.length, sC), carryAt(o, C, 0));
    C._swO = o; C._swN = C.segs.length; C._sw = w; return w;
  }
  // the radius of turning at each point of a root's drawn path (the steps as grown), kept with the root
  function turnRadii(R, s) {
    if (R._tr && R._trS === s) return R._tr;
    const n = s.length, rad = new Float64Array(n); rad[0] = rad[n - 1] = Infinity;
    for (let i = 1; i < n - 1; i++) {
      const ax = s[i].x - s[i - 1].x, ay = s[i].y - s[i - 1].y, bx = s[i + 1].x - s[i].x, by = s[i + 1].y - s[i].y;
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by), ang = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
      rad[i] = ang > 1e-4 ? (la + lb) / 2 / ang : Infinity;
    }
    R._tr = rad; R._trS = s; return rad;
  }
  function outline(o, R, nVis) {
    const s0 = pathOf(o, R), nf = Math.min(s0.length, nVis == null ? s0.length : nVis + (R._pre || 0));   // _pre: points drawn before the first step
    if (!(nf > 1 + 1e-6)) return null;
    // nVis may be part way through a step (a page playing a growth smoothly): the last point then sits that far along its
    // step, and widths run over the length shown. A whole nVis draws exactly as before.
    const n = Math.ceil(nf - 1e-9); let s = s0;
    if (n - nf > 1e-9) { const a = s0[n - 2], b = s0[n - 1], f = 1 - (n - nf); s = s0.slice(0, n); s[n - 1] = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; }
    const k = exitIndex(o, R, s0), carries = !!(o.branchFit && R._kids && R._kids.some(C => !C.burn && C.at + (R._pre || 0) <= nf - 1));
    const base = o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * K;
    const wf = R.burn ? charWidth : (k < 0 && !carries ? widthAt : (o2, R2, i, m) => Math.max(o2.minWidth, rawWidth(o2, R2, i, m, s0), carries ? carryAt(o2, R2, i, nf) : 0));
    const L = [], Rr = [];
    let lim = null; const hs = [];
    if (o.bend) {                                   // the radius of turning at each step, the tightest of its neighbours
      const full = turnRadii(R, s0), rad = [];      // worked out once per root for its whole path; the ends shown never bend
      for (let i = 0; i < n; i++) rad.push(i === 0 || i === n - 1 ? Infinity : full[i]);
      lim = rad.map((r, i) => o.bend * Math.min(r, rad[Math.max(0, i - 1)], rad[Math.min(n - 1, i + 1)]));
    }
    for (let i = 0; i < n; i++) {
      const p0 = s[Math.max(0, i - 1)], p1 = s[Math.min(n - 1, i + 1)];
      let dx = p1.x - p0.x, dy = p1.y - p0.y; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      let h = wf(o, R, i, nf) / 2; if (lim) h = Math.max(Math.min(h, lim[i]), Math.min(h, o.minWidth / 2)); hs.push(h);
      L.push([s[i].x - dy * h, s[i].y + dx * h]); Rr.push([s[i].x + dy * h, s[i].y - dx * h]);
    }
    const cap = (p, q, h) => { const ang = Math.atan2(p.y - q.y, p.x - q.x) - Math.PI / 2, out = []; for (let k = 1; k < 8; k++) { const a = ang + Math.PI * k / 8; out.push([p.x + Math.cos(a) * h, p.y + Math.sin(a) * h]); } return out; };
    return [...Rr, ...cap(s[n - 1], s[n - 2], hs[n - 1]), ...L.reverse(), ...cap(s[0], s[1], hs[0])];
  }
  function polyD(pts) { return 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z'; }

  // ---------- canvas
  function draw(ctx, scene, step, ink, ground) {
    const o = scene.o;
    for (const it of scene.insts) { const p = it.info.glyph.getPath(it.x, it.y, U); p.fill = ink; p.stroke = null; p.draw(ctx); }
    ctx.fillStyle = ink;
    const burn = [];
    for (const R of scene.roots) {
      const n = step == null ? R.segs.length : scene.clock ? scene.clock(R, step) : Math.min(R.segs.length, step - R.birth + 1);   // clock: a page's own pacing
      if (!(n > 1 + 1e-6)) continue;                                   // a hair past the first point is not yet a step
      if (R.burn) { burn.push([R, n]); continue; }
      const pts = outline(o, R, n); if (!pts) continue;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill();
    }
    if (burn.length) {
      ctx.fillStyle = ground;
      for (const [R, n] of burn) { const pts = outline(o, R, n); if (!pts) continue; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); }
    }
  }

  // ---------- SVG
  let paperReady = false;
  function ensurePaper() { if (paperReady) return; const c = document.createElement('canvas'); c.width = 10; c.height = 10; paper.setup(c); paperReady = true; }

  // paper.js simplify can, rarely, fit a curve with a handle many times longer than the curve itself (a spike);
  // when that happens the unsimplified outline is kept for that shape
  function wild(path) {
    for (const k of (path.children || [path])) for (const c of k.curves) {
      const ch = c.point1.getDistance(c.point2), lim = 4 * ch + 40;
      if (c.handle1.length > lim || c.handle2.length > lim || !isFinite(c.point1.x + c.point1.y)) return true;
    }
    return false;
  }
  function simplified(path, tol) { const keep = path.clone({ insert: false }); path.simplify(tol); return wild(path) ? keep : path; }
  function unitedPaths(scene) {
    ensurePaper();
    const o = scene.o; const out = [];
    for (const it of scene.insts) {
      let shape = new paper.CompoundPath({ pathData: it.info.glyph.getPath(it.x, it.y, U).toPathData(2), insert: false });
      const mine = scene.roots.filter(R => R.inst === it);
      const grow = new paper.CompoundPath({ insert: false }), burn = new paper.CompoundPath({ insert: false });
      for (const R of mine) { const pts = outline(o, R); if (!pts) continue; let p = new paper.Path({ segments: pts, closed: true, insert: false }); if (o.simplify) p = simplified(p, o.simplify); (R.burn ? burn : grow).addChild(p); }
      if (grow.children.length) shape = shape.unite(grow, { insert: false });
      if (burn.children.length) shape = shape.subtract(burn, { insert: false });
      if (o.simplify) shape = simplified(shape, o.simplify);
      out.push({ ch: it.info.ch, d: shape.pathData });
    }
    return out;
  }
  function svg(scene, ink, mode, name) {
    const b = scene.b, pad = 40;
    const vb = [b.x0 - pad, b.y0 - pad, b.x1 - b.x0 + 2 * pad, b.y1 - b.y0 + 2 * pad].map(v => v.toFixed(1));
    let body;
    if (mode === 'united') body = `<g id="${name}" fill="${ink}">` + unitedPaths(scene).map(p => `<path d="${p.d}"/>`).join('') + '</g>';
    else {
      const g = scene.insts.map(it => `<path d="${it.info.glyph.getPath(it.x, it.y, U).toPathData(1)}"/>`).join('');
      const r = scene.roots.filter(R => !R.burn).map(R => { const pts = outline(scene.o, R); return pts ? `<path d="${polyD(pts)}"/>` : ''; }).join('');
      const c = scene.roots.filter(R => R.burn).map(R => { const pts = outline(scene.o, R); return pts ? `<path d="${polyD(pts)}"/>` : ''; }).join('');
      body = `<g id="${name}"><g id="GROWTH" fill="${ink}">${r}</g><g id="GLYPH" fill="${ink}">${g}</g>` + (c ? `<g id="CHAR" fill="#FFFFFF">${c}</g>` : '') + '</g>';
    }
    const w = (+vb[2] / 4).toFixed(0), h = (+vb[3] / 4).toFixed(0);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${w}" height="${h}">${body}</svg>`;
  }

  // ---------- fonts (growth frozen per character)
  function buildFont(fonts, charset, o, family, style, ligatures) {
    o = opts(o); ensurePaper();
    const glyphs = [new opentype.Glyph({ name: '.notdef', advanceWidth: 600, path: new opentype.Path() })];
    const seen = new Set();
    const one = (info, unicode, seedKey) => {
      const adv = Math.round(info.glyph.advanceWidth * info.scale);
      const name = info.glyph.name || ('uni' + (unicode || 0).toString(16).toUpperCase().padStart(4, '0'));
      if (unicode && String.fromCodePoint(unicode).trim() === '') return new opentype.Glyph({ name: unicode === 32 ? 'space' : name, unicode, advanceWidth: adv, path: new opentype.Path() });
      const hk = hash2(o.seed, seedKey);
      const inst = { info, x: 0, y: 0, adv, index: 1, line: 0, rng: mulberry32(hk), id: 0, ignite: 0, fdx: (hk % 1000) / 7.3, fdy: ((hk >>> 10) % 1000) / 9.1 };
      const scene = growInstances([inst], opts(Object.assign({}, o, { ignite: null, connect: o.connectSelf ? o.connect : 0, seek: o.connectSelf ? o.seek : 0 })));
      const d = unitedPaths(scene)[0].d;
      const pp = new paper.CompoundPath({ pathData: d, insert: false });
      const op = new opentype.Path();
      const kids = pp.className === 'CompoundPath' ? pp.children : [pp];
      for (const k of kids) {
        if (!k.segments.length) continue;
        const s0 = k.segments[0].point; op.moveTo(s0.x, -s0.y);
        for (const c of k.curves) { const h1 = c.point1.add(c.handle1), h2 = c.point2.add(c.handle2); op.bezierCurveTo(h1.x, -h1.y, h2.x, -h2.y, c.point2.x, -c.point2.y); }
        op.closePath();
      }
      const spec = { name, advanceWidth: adv, path: op };
      if (unicode) spec.unicode = unicode;
      return new opentype.Glyph(spec);
    };
    for (const ch of Array.from(charset)) {
      if (seen.has(ch)) continue; seen.add(ch);
      const info = findGlyph(fonts, ch); if (!info) continue;
      glyphs.push(one(info, ch.codePointAt(0), ch.codePointAt(0)));
    }
    for (const nm of (ligatures || [])) {
      const info = glyphByName(fonts[0], nm, nm); if (!info) continue;
      glyphs.push(one(info, 0, hash2(9001, nm.length * 131 + nm.charCodeAt(0))));
    }
    const font = new opentype.Font({ familyName: family, styleName: style || 'Regular', unitsPerEm: U, ascender: 800, descender: -200, glyphs });
    return font.toArrayBuffer();
  }

  // grow from pre-built instances (fonts)
  function growInstances(insts, o) {
    const lin = { next: 0 }; let roots = [];
    for (const it of insts) roots = roots.concat(seedInstance(it, o, it.rng, 0, lin));
    const sc = { insts, roots, joints: [] };
    runLoop(sc, o, o.maxSteps);
    if (o.hangulGuard) sc.roots = guardHangul(o, sc.roots);
    return { o, insts, roots: sc.roots, joints: sc.joints, total: sc.total, b: null };
  }

  function runLoop(sc, o, maxT, prior) {
    const insts = sc.insts, roots = sc.roots, joints = sc.joints;
    const grid = (o.connect > 0 || o.seek > 0) ? new Grid(Math.max(o.connect, 40)) : null;
    if (grid) {
      for (const it of insts) {
        const body = fillPoints(it.info, opts({ stage: 4 }));
        const every = Math.max(1, Math.round(body.length / 60));
        body.forEach((q, i) => { if (i % every === 0) grid.add({ x: it.x + q.x, y: it.y + q.y, inst: it.id, lin: -1 }); });
      }
      // roots already grown (the plant at growth 10, when more roots grow above it) can be joined like any other
      if (prior) for (const R of prior) if (!R.burn) R.segs.forEach((p, j) => { if (j && !(j & 1)) grid.add({ x: p.x, y: p.y, inst: R.inst.id, lin: R.lineage }); });
    }
    const target = o.drift ? o.drift.angle * Math.PI / 180 : 0;
    const field = o.flow ? noise(hash2(o.seed, 4242)) : null;
    const okFor = R => it => (it.inst !== R.inst.id) || (o.connectSelf && it.lin !== -1 && it.lin !== R.lineage);
    const cap = o.growth ? insts.reduce((sum, it) => sum + ((it.o.stage / 20) * 15) * 120, 0) : Math.max(1, insts.length) * ((o.stage / 20) * 15) * 120;
    for (let t = 1; t <= maxT; t++) {
      let active = false; const n = roots.length;
      for (let r = 0; r < n; r++) {
        const R = roots[r];
        if (R.done) continue;
        if (R.birth >= t) { active = true; continue; }
        if (R.segs.length > R.max) { R.done = true; continue; }
        active = true;
        const age = R.segs.length, frac = age / Math.max(R.max, 1), rng = R.inst.rng;
        const chaos = o.chaosRamp ? o.chaos * (1 + o.chaosRamp * frac) : o.chaos;
        let a = R.a + (rng() - 0.5) * chaos;
        if (!R.burn) {
          if (o.drift) a += o.drift.pull * Math.sin(target - a);
          if (o.curl) a += o.curl * R.spin * (o.curlRamp ? Math.pow(frac, o.curlRamp) : 1);
          if (field) { const f = field(R.x / o.flow.scale + (R.inst.fdx || 0), R.y / o.flow.scale + (R.inst.fdy || 0)) * Math.PI * 2 * o.flow.turns; a += o.flow.strength * Math.sin(f - a); }
          if (grid && o.seek > 0 && age >= o.fuseAge) { const it = grid.near(R.x, R.y, o.sense, okFor(R)); if (it) a += o.seek * Math.sin(Math.atan2(it.y - R.y, it.x - R.x) - a); }
        }
        if (o.hold && R.edge && age < o.hold) a = R.a + (a - R.a) * (age / o.hold);
        if (o.twirl && !R.burn) {
          const T = o.twirl;
          if (!R.tw && (R.twn || 0) < (T.max || 1) && age >= (T.min || 12) && rng() < T.p) {
            const turns = T.turns[0] + rng() * (T.turns[1] - T.turns[0]), r0 = T.r0[0] + rng() * (T.r0[1] - T.r0[0]), r1 = r0 * T.r1;
            const n = Math.max(6, Math.round(2 * Math.PI * turns * (r0 + r1) / 2 / (2 * K)));
            let spin = rng() < 0.5 ? -1 : 1;
            if (T.follow && field) { const f = field(R.x / o.flow.scale + (R.inst.fdx || 0), R.y / o.flow.scale + (R.inst.fdy || 0)) * Math.PI * 2 * o.flow.turns; spin = Math.sin(f - R.a) < 0 ? -1 : 1; }   // curl the way the current already turns it, so neighbours curl together
            R.tw = { k: 0, n, r0, r1, spin }; R.twn = (R.twn || 0) + 1;
          }
          if (R.tw) { const w = R.tw, r = w.r0 + (w.r1 - w.r0) * (w.k / w.n); a = R.a + (a - R.a) * 0.25 + w.spin * (2 * K) / r; if (++w.k >= w.n) R.tw = null; }
        }
        // a soft band: each root has its own reach (jitter) and is turned back towards its letter as it nears it, so the mat
        // ends in a ragged edge instead of a straight cut where every root stopped at the same line
        if (o.prune && o.prune.soft && !R.burn) {
          const P = o.prune; if (R.pj == null) { R.pj = 1 + (rng() - 0.5) * 2 * (P.jitter || 0); R.pl = rng() < (P.loop == null ? 1 : P.loop) ? (P.pull || 0.25) : 0; }
          const lx = R.x - R.inst.x, ly = R.y - R.inst.y, adv = R.inst.adv, j = R.pj, m = R.inst.reach || 0;
          const d = Math.min(ly + P.top * j + m, P.bottom * j + m - ly, lx + P.side * j + m, adv + P.side * j + m - lx);
          if (d < P.soft && R.pl) { const u = 1 - Math.max(0, d) / P.soft; a += R.pl * u * Math.sin(Math.atan2((P.bottom - P.top) / 2 - ly, adv / 2 - lx) - a); }   // only a few turn back; the rest stop at their own reach
        }
        R.a = a;
        const nx = R.x + Math.cos(a) * 2 * K, ny = R.y + Math.sin(a) * 2 * K;
        if (R.burn && !inside(letter(R.inst.info), nx - R.inst.x, ny - R.inst.y)) { R.done = true; continue; }
        if (o.prune) { const lx = nx - R.inst.x, ly = ny - R.inst.y, adv = R.inst.adv, j = o.prune.soft ? (R.pj || 1) : 1, m = R.inst.reach || 0; if (ly < -o.prune.top * j - m || ly > o.prune.bottom * j + m || lx < -o.prune.side * j - m || lx > adv + o.prune.side * j + m) { R.done = true; continue; } }
        if (grid && o.connect > 0 && age >= o.fuseAge && !R.burn) {
          const it = grid.near(nx, ny, o.connect, okFor(R));
          if (it) { R.segs.push({ x: it.x, y: it.y }); R.x = it.x; R.y = it.y; R.done = true; R.fused = true; joints.push({ x: it.x, y: it.y, t }); continue; }
        }
        R.x = nx; R.y = ny; R.segs.push({ x: nx, y: ny });
        if (grid && !R.burn && (age & 1) === 0) grid.add({ x: nx, y: ny, inst: R.inst.id, lin: R.lineage });
        if (rng() < o.branch * (1 + o.branchRamp * frac) && roots.length < cap) {
          const local = o.taper ? Math.max(0.2, 1 - o.taper * Math.pow(frac, o.taperPow)) : 1;
          const B = makeRoot(rng, R.inst.o || o, nx, ny, a + (rng() - 0.5) * 2, R.thick * local, t, R.lineage, R.inst);
          B.burn = R.burn; Object.defineProperty(B, 'parent', { value: R, writable: true }); B.at = R.segs.length - 1; roots.push(B);
          if (!R._kids) Object.defineProperty(R, '_kids', { value: [], writable: true }); R._kids.push(B);
        }
      }
      if (!active) break;
    }
    sc.total = 0; for (const R of roots) sc.total = Math.max(sc.total, R.birth + R.segs.length);
  }

  global.RhizomaSmoke = { U, K, DEFAULTS, opts, findGlyph, glyphByName, layout, grow, draw, outline, pathOf, guardHangul, polyD, widthAt, svg, unitedPaths, simplified, buildFont, growInstances, fillPoints, edgePoints, letter, hash2, mulberry32 };
})(typeof window !== 'undefined' ? window : globalThis);

(function () {
  'use strict';
  const PRESETS = {"SMOKE": {"stage": 8, "weightUnits": 40, "taper": 0.85, "chaos": 0.25, "chaosRamp": 4, "drift": {"angle": -90, "pull": 0.05}, "length": 2.0, "hangulDensity": 0.45, "engine": "v1"}, "DRAG": {"stage": 10, "weightUnits": 40, "taper": 0.8, "chaos": 0.2, "flow": {"scale": 900, "strength": 0.2, "turns": 1.4}, "length": 1.7, "seedFrom": "edge", "emerge": 0.8, "edgeBoost": 2.2, "connect": 24, "seek": 0.04, "sense": 150, "hangulDensity": 0.45, "minWidth": 6, "smooth": 3, "fillet": {"amp": 0.12, "tau": 8}, "inset": 0.7, "hold": 5, "bend": 0.9, "minContour": 160, "stagger": 36, "taperPow": 1.7, "twirl": {"p": 0.005, "turns": [1, 1.6], "r0": [200, 380], "r1": 0.45, "min": 14, "max": 1, "follow": true}, "branchFit": 1}, "FLAME": {"stage": 9, "weightUnits": 46, "taper": 1, "taperPow": 0.6, "chaos": 0.5, "chaosRamp": 2, "drift": {"angle": -90, "pull": 0.16}, "length": 0.7, "branch": 0.006, "branchRamp": 1.5, "seedFrom": "edge", "emerge": 0.8, "facing": {"angle": -90, "spread": 70}, "edgeBoost": 3, "hangulDensity": 0.45, "minWidth": 6, "smooth": 3, "fillet": {"amp": 0.12, "tau": 8}, "inset": 0.7, "hold": 5, "bend": 0.9, "minContour": 160, "stagger": 36, "branchFit": 1}, "ROOT": {"stage": 8, "weightUnits": 40, "taper": 0.75, "chaos": 0.8, "seedFrom": "edge", "emerge": 0.6, "prune": {"top": 820, "bottom": 300, "side": 30}, "hangulDensity": 0.45, "minWidth": 6, "smooth": 3, "fillet": {"amp": 0.12, "tau": 8}, "hangulGuard": {"side": 30, "tick": 150, "straight": 0.85}, "inset": 0.7, "hold": 5, "bend": 0.9, "minContour": 160, "stagger": 36, "branchFit": 1}, "TANGLE": {"stage": 14, "weightUnits": 44, "taper": 0.2, "chaos": 0.8, "branch": 0.012, "length": 2.2, "seedFrom": "both", "emerge": 0.5, "connect": 26, "connectSelf": true, "fuseAge": 30, "seek": 0.06, "sense": 200, "maxSteps": 400, "prune": {"top": 1100, "bottom": 700, "side": 400, "soft": 260, "pull": 0.25, "jitter": 0.3, "loop": 0.15}, "hangulDensity": 0.45, "minWidth": 6, "smooth": 3, "fillet": {"amp": 0.12, "tau": 8}, "inset": 0.7, "hold": 5, "bend": 0.9, "minContour": 160, "stagger": 36, "branchFit": 1}};
  const NAMES = { SMOKE: 'SG Smoke', DRAG: 'SG Drag', ROOT: 'SG Roses', RHIZOMA: 'SG Rhizoma V2', FLAME: 'SG Flame', TANGLE: 'SG Tangle' };
  // each face's growth, fitted to Rhizoma's scale: [below 10, above 10, share of the rise above 10 that goes to line weight,
  // how far the bounds a face keeps its roots in open by 20 (units; SG Roses and SG Tangle)]. 10 is each face as tuned, the
  // fonts, and stays exactly as it was. SG Roses, SG Flame and SG Tangle grow to the top of Rhizoma's scale, SG Roses until
  // its letters are lost as SG Rhizoma V2's are; SG Smoke and SG Drag stop where their drawing still holds 60 frames a
  // second. Line weight at 20 is as it was. SG Rhizoma V2 keeps Dabin Kim's own scale.
  const GSCALE = {"SMOKE": [1, 0.4, 0.5], "DRAG": [1, 0.7, 0.3], "FLAME": [1, 1, 0.4], "ROOT": [1, 1, 0.5, 1000000000.0], "TANGLE": [1.4, 0.6, 0.5, 1500]};
  const COLOURS = {
    void:   { ink: '#0A0807', ground: '#EBE6D7' },
    bone:   { ink: '#EBE6D7', ground: '#0A0807' },
    slate:  { ink: '#A5C6D2', ground: '#1C2322' },
    oxide:  { ink: '#E59A60', ground: '#713840' },
    indigo: { ink: '#B4785F', ground: '#0C123A' },
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S2 = window.RhizomaSmoke, S1 = window.RhizomaLab;
  let FONTS = null;

  // ---------- growth
  // SG Smoke grows on the Rhizoma Lab engine, one growth per letter, so a seed always brings back the same growth.
  // Line breaks are added (a new line moves down and starts again at the left), and the roots are drawn smoothed (below).
  const SMOKE_ORIGINAL = {"stage": 8, "weightUnits": 40, "taper": 0.85, "chaos": 0.25, "chaosRamp": 4, "drift": {"angle": -90, "pull": 0.05}, "length": 2.0};
  const LINE = 1300;
  // growth along the text, as in the Smoke engine: letter k of n grows at from + (to - from) * k / (n - 1) on Rhizoma's
  // growth-stage scale (0 to 20, 10 = the face as tuned); each step moves the stage by one and the line weight by 4%
  function growthAt(g, k, n) { const v = g.from + (g.to - g.from) * (n > 1 ? k / (n - 1) : 0), sc = g.scale; return sc ? 10 + (v - 10) * (v < 10 ? sc[0] : sc[1]) : v; }
  function weightFor(gv, g) { const w = g && g.scale && g.scale[2] != null && gv > 10 ? 10 + (gv - 10) * g.scale[2] : gv; return 0.6 + 0.04 * w; }   // scale[2]: how much of the rise above 10 goes to line weight
  function stageFor(stage, gv) { return Math.min(20, Math.max(0, stage + gv - 10)); }
  // the plant as it stood at a share t of its growth: roots not yet born are left out, the rest cut where their tip was
  function earlier(roots, t) {
    const T = Math.max(0, Math.min(1, t)) * Math.max(1, ...roots.map(R => R.birth + R.segs.length)), out = [];
    for (const R of roots) { const n = Math.min(R.segs.length, Math.floor(T - R.birth) + 1); if (n >= 2) { R.segs = R.segs.slice(0, n); out.push(R); } }
    return out;
  }
  // roots above growth 10: a second plant for the letter, grown as if at the top of SG Smoke's scale (17), whose trunks
  // join in a fixed order as growth rises, each with its branches, and grow further the higher it goes; they start a little
  // after the first plant's trunks
  const MORE_AT = 10 + 10 * GSCALE.SMOKE[1], MORE_DELAY = 20;
  function moreRoots(info, o, i, base, gv) {
    const L = S1, share = Math.min(1, (gv - 10) / (MORE_AT - 10)); if (share <= 0) return [];
    const ox = L.opts(Object.assign({}, o, { stage: stageFor(o.stage, MORE_AT), maxSteps: Math.round(o.maxSteps * (1 + (MORE_AT - 10) / 10)) }));
    const all = L.grow(info, ox, L.hash2(L.hash2(o.seed, i + 1), 0x51ED)), key = p => Math.round(p.x * 64) + ',' + Math.round(p.y * 64), at = new Map(), keep = new Set();
    for (const R of all) R.segs.forEach((p, j) => { if (j) { const k = key(p); if (!at.has(k)) at.set(k, R); } });
    let t = 0;
    for (const R of all.slice().sort((a, b) => a.birth - b.birth)) {
      const P = R.birth > 0 ? at.get(key(R.segs[0])) : null;
      if (P && P !== R) { if (keep.has(P)) keep.add(R); continue; }
      if (((L.hash2(L.hash2(o.seed, i + 7), t++) >>> 0) / 4294967296) < share) keep.add(R);
    }
    const out = earlier(all.filter(R => keep.has(R)), share);   // and they reach further as growth rises, as one plant would
    for (const R of out) { if (!(R.birth > 0)) R.trunk = true; R.birth += MORE_DELAY; }
    return out;
  }
  function makeSceneOriginal(text, seed, growth) {
    const L = S1;
    const o = L.opts(Object.assign({}, SMOKE_ORIGINAL, { seed: seed, hangulDensity: 0.45 }));
    let nG = 0, kG = 0;
    if (growth) for (let i = 0; i < text.length; i++) { const ch = text[i]; if (ch !== '\n' && ch.trim() !== '' && L.findGlyph(FONTS, ch)) nG++; }
    const items = []; let x = 0, y = 0, prev = null;
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const gb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    let total = 0, nRoots = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\n') { x = 0; y += LINE; prev = null; continue; }
      const info = L.findGlyph(FONTS, ch);
      if (!info) { prev = null; continue; }
      if (prev && prev.font === info.font) x += info.font.getKerningValue(prev.glyph, info.glyph) * info.scale;
      const adv = info.glyph.advanceWidth * info.scale;
      if (ch.trim() === '') { x += adv; prev = info; continue; }
      let oi = o;
      // growth adds up on one plant: every growth value grows this letter's plant at growth 10 (so 10 is untouched), shows it
      // earlier in its growth below 10, as the variable fonts do, and gives it more roots above 10, picked from a second,
      // denser and longer plant in a fixed order, so 11 holds all of 10 and 12 all of 11
      let roots;
      if (growth) {
        const gv = growthAt(growth, kG++, nG);
        oi = L.opts(Object.assign({}, o, { weightUnits: o.weightUnits * weightFor(gv, growth) }));
        roots = L.grow(info, o, L.hash2(o.seed, i + 1));
        if (gv < 10) roots = earlier(roots, Math.pow(gv / 10, 1.5));   // low growth stays sparse: 2 is under a tenth of the way
        else if (gv > 10) roots = roots.concat(moreRoots(info, o, i, roots, gv));
      } else roots = L.grow(info, oi, L.hash2(o.seed, i + 1));
      const path = info.glyph.getPath(x, y, 1000);
      const pb = path.getBoundingBox();
      b.x0 = Math.min(b.x0, pb.x1); b.y0 = Math.min(b.y0, pb.y1); b.x1 = Math.max(b.x1, pb.x2); b.y1 = Math.max(b.y1, pb.y2);
      gb.x0 = Math.min(gb.x0, pb.x1); gb.y0 = Math.min(gb.y0, pb.y1); gb.x1 = Math.max(gb.x1, pb.x2); gb.y1 = Math.max(gb.y1, pb.y2);
      for (const R of roots) {
        nRoots++; total = Math.max(total, R.birth + R.segs.length);
        for (const p of R.segs) { const px = p.x + x, py = p.y + y; if (px < b.x0) b.x0 = px; if (px > b.x1) b.x1 = px; if (py < b.y0) b.y0 = py; if (py > b.y1) b.y1 = py; }
      }
      items.push(growth ? { x, y, path, roots, o: oi } : { x, y, path, roots });
      x += adv; prev = info;
    }
    if (!isFinite(b.x0)) { b.x0 = 0; b.y0 = -800; b.x1 = 1000; b.y1 = 200; }
    const pad = 60; b.x0 -= pad; b.y0 -= pad; b.x1 += pad; b.y1 += pad;
    return { kind: 'smoke', items, o, b, gb, total, nRoots, text, presetName: 'SMOKE' };
  }
  function widthVis(o, R, i, n) {
    const base = o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * S1.K;
    const t = o.taper ? 1 - o.taper * Math.min(1, i / Math.max(n - 1, 1)) : 1;   // n can be part way through a step
    return Math.max(o.minWidth, base * R.thick * Math.max(t, 0.02));
  }
  // SG Smoke is drawn smoothed: each root follows its steps after three passes of a 1-2-1 filter (the ends stay where
  // they grew), and a trunk swells a little where it leaves the letter. The growth itself is the lab's, unchanged.
  const SMOOTH = 3, SWELL = { amp: 0.3, tau: 2 };
  let _inkc = null;
  function inkCtx() { if (!_inkc) { const c = document.createElement('canvas'); c.width = 4; c.height = 4; _inkc = c.getContext('2d'); } return _inkc; }
  function smoothed(R) {
    if (R._sm) return R._sm;
    let p = R.segs.map(q => ({ x: q.x, y: q.y }));
    if (p.length > 2) for (let k = 0; k < SMOOTH; k++) {
      const q = p.map(a => ({ x: a.x, y: a.y }));
      for (let i = 1; i < p.length - 1; i++) { q[i].x = (p[i - 1].x + 2 * p[i].x + p[i + 1].x) / 4; q[i].y = (p[i - 1].y + 2 * p[i].y + p[i + 1].y) / 4; }
      p = q;
    }
    return (R._sm = p);
  }
  function letterOf(it) { return it._p2d || (it._p2d = new Path2D(it.path.toPathData(2))); }
  // the step where a trunk leaves its letter (-1: a branch, or it never does)
  function leaves(R, s, it) {
    if (R._k !== undefined) return R._k;
    let k = -1;
    if (SWELL.amp && (!(R.birth > 0) || R.trunk)) {
      const c = inkCtx(), p2d = letterOf(it);
      let was = c.isPointInPath(p2d, s[0].x + it.x, s[0].y + it.y);
      if (!was) k = 0;
      else for (let i = 1; i < s.length; i++) { const now = c.isPointInPath(p2d, s[i].x + it.x, s[i].y + it.y); if (was && !now) { k = i; break; } was = now; }
    }
    return (R._k = k);
  }
  function swell(i, k) { return k < 0 ? 1 : (i < k ? 1 + SWELL.amp : 1 + SWELL.amp * Math.exp(-(i - k) / SWELL.tau)); }
  // a parent is drawn at least as wide as each branch it carries, up to the step the branch leaves it, then eases back to
  // its own width over ENV_EASE steps; branches keep their own width. So no thick root sprouts from a thin one, and no
  // branch thins to a thread (a root system is a set of pipes). Growth is unchanged; the parent is the root whose step
  // the branch starts on, and while the scene grows a branch only counts once it shows.
  const ENV_EASE = 8;
  function ownW(o, R, i, it) { const base = o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * S1.K, n = R.segs.length, t = o.taper ? 1 - o.taper * (i / Math.max(n - 1, 1)) : 1; return base * R.thick * Math.max(t, 0.02) * swell(i, leaves(R, smoothed(R), it)); }
  function envAt(R, i, step) {
    let w = 0; if (!R._env) return 0;
    for (const e of R._env) { if (step != null && (e.c._show != null ? e.c._show : e.b) > step) continue; const d = i - e.k, u = d / ENV_EASE, f = d <= 0 ? 1 : d >= ENV_EASE ? 0 : 1 - u * u * (3 - 2 * u); if (e.r * f > w) w = e.r * f; }
    return w;
  }
  function fitItem(it, o) {
    if (it._fitted) return; it._fitted = true; o = it.o || o;
    const key = p => Math.round(p.x * 64) + ',' + Math.round(p.y * 64), at = new Map();
    for (const R of it.roots) { R._env = []; R.segs.forEach((p, j) => { if (j) { const kk = key(p); if (!at.has(kk)) at.set(kk, [R, j]); } }); }
    for (const R of it.roots.slice().sort((a, b) => b.birth - a.birth)) {   // a branch before its parent, so carried widths add up the tree
      const m = R.birth > 0 && !R.trunk && at.get(key(R.segs[0])); if (!m || m[0] === R) continue;
      m[0]._env.push({ k: m[1], r: Math.max(ownW(o, R, 0, it), envAt(R, 0)), b: R.birth, c: R });
    }
  }
  function envOf(R, it, o, i, step) { if (!it._fitted) fitItem(it, o); return envAt(R, i, step); }
  // the lab's outline() on the smoothed path, with the swell; the root sits at (it.x, it.y)
  function smokeOutline(o, R, it, nVis) {
    o = it.o || o;
    const s = smoothed(R), n = nVis == null ? s.length : Math.min(s.length, nVis);
    if (n < 2) return null;
    const k = leaves(R, s, it), base = o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * S1.K;
    envOf(R, it, o, 0); const w = i => { const t = o.taper ? 1 - o.taper * (i / Math.max(n - 1, 1)) : 1; return Math.max(o.minWidth, base * R.thick * Math.max(t, 0.02) * swell(i, k), envAt(R, i)); };
    const P = s.slice(0, n).map(q => ({ x: q.x + it.x, y: q.y + it.y })), L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(n - 1, i + 1)];
      let dx = p1.x - p0.x, dy = p1.y - p0.y; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const h = w(i) / 2;
      L.push([P[i].x - dy * h, P[i].y + dx * h]); Rr.push([P[i].x + dy * h, P[i].y - dx * h]);
    }
    const cap = (p, q, h, from) => { const ang = Math.atan2(p.y - q.y, p.x - q.x), out = []; for (let j = 1; j < 8; j++) { const a = ang + from + Math.PI * j / 8; out.push([p.x + Math.cos(a) * h, p.y + Math.sin(a) * h]); } return out; };
    return [...Rr, ...cap(P[n - 1], P[n - 2], w(n - 1) / 2, -Math.PI / 2), ...L.reverse(), ...cap(P[0], P[1], w(0) / 2, -Math.PI / 2)];
  }
  // glyph and roots as one shape, as the lab's glyphShape() does
  function smokeUnion(o, it, simplify) {
    if (!paper.project) { const c = document.createElement('canvas'); c.width = 10; c.height = 10; paper.setup(c); }
    const simp = simplify || ((path, tol) => S2.simplified(path, tol));
    let shape = new paper.CompoundPath({ pathData: it.path.toPathData(2), insert: false });
    if (!it.roots.length) return shape;   // a letter without roots stays exactly as drawn
    const roots = new paper.CompoundPath({ insert: false });
    for (const R of it.roots) { const pts = smokeOutline(o, R, it); if (!pts) continue; let p = new paper.Path({ segments: pts, closed: true, insert: false }); if (o.simplify) p = simp(p, o.simplify); roots.addChild(p); }
    if (roots.children.length) shape = shape.unite(roots, { insert: false });
    if (o.simplify) shape = simp(shape, o.simplify);
    return shape;
  }
  function drawOriginal(ctx, scene, step, ink, pick, letters = true) {
    const buckets = new Map();
    for (const it of scene.items) {
      for (const R of it.roots) {
        if (pick && !pick(R)) continue;
        const nf = step == null ? R.segs.length : scene.clock ? scene.clock(R, step) : Math.min(R.segs.length, step - R.birth + 1);
        if (!(nf > 1 + 1e-6)) continue;                                  // a hair past its first point is not yet a step
        const s = smoothed(R), k = leaves(R, s, it), n = Math.ceil(nf - 1e-9);   // the last step drawn may be part way
        for (let i = 1; i < n; i++) {
          const wv = Math.max(widthVis(it.o || scene.o, R, i, nf) * swell(i, k), envOf(R, it, scene.o, i, step));
          const key = Math.max(2, Math.round(wv / 3) * 3);
          let p = buckets.get(key); if (!p) { p = new Path2D(); buckets.set(key, p); }
          const a = s[i - 1], c = s[i], f = i === n - 1 && n - nf > 1e-9 ? 1 - (n - nf) : 1;
          p.moveTo(a.x + it.x, a.y + it.y); p.lineTo(a.x + (c.x - a.x) * f + it.x, a.y + (c.y - a.y) * f + it.y);
        }
      }
    }
    ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [k, p] of buckets) { ctx.lineWidth = k; ctx.stroke(p); }
    if (letters) for (const it of scene.items) { it.path.fill = ink; it.path.stroke = null; it.path.draw(ctx); }
  }
  function svgWrap(b, inner) {
    const vb = [b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0].map(v => v.toFixed(1)).join(' ');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + ((b.x1 - b.x0) / 4).toFixed(0) + '" height="' + ((b.y1 - b.y0) / 4).toFixed(0) + '">' + inner + '</svg>';
  }
  function svgLayersOriginal(sc, ink) {
    const g = [], r = [];
    for (const it of sc.items) {
      g.push('<path d="' + it.path.toPathData(1) + '"/>');
      for (const R of it.roots) {
        const pts = smokeOutline(sc.o, R, it);
        if (pts) r.push('<path d="M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z"/>');
      }
    }
    const name = 'RHIZOMA_' + sc.presetName + '_seed' + sc.o.seed;
    return svgWrap(sc.b, '<g id="' + name + '"><g id="GROWTH" fill="' + ink + '">' + r.join('') + '</g><g id="GLYPH" fill="' + ink + '">' + g.join('') + '</g></g>');
  }
  function svgUnitedOriginal(sc, ink) {
    if (typeof paper === 'undefined') throw new Error('paper');
    const name = 'RHIZOMA_' + sc.presetName + '_seed' + sc.o.seed + '_united';
    return svgWrap(sc.b, '<g id="' + name + '" fill="' + ink + '">' + sc.items.map(it => '<path d="' + smokeUnion(sc.o, it).pathData + '"/>').join('') + '</g>');
  }

  // SG Rhizoma V2: Dabin Kim's growth code (script.js in Rhizoma Engine v.01) at her default settings.
  // Math.random becomes a seeded generator, the canvas alpha test becomes a geometric one, and Hangul comes from Song Myung; the formulas and their order are hers.
  const DK = { size: 100, stage: 10, thickness: 4.0, length: 1.5, randomness: 0.8, branch: 0.007 };
  let _dk = null;
  function dkCtx() { if (!_dk) { const c = document.createElement('canvas'); c.width = 4; c.height = 4; _dk = c.getContext('2d'); } return _dk; }
  function growRhizoma(text, seed, glyphFor, growth) {
    const rng = S1.mulberry32(S1.hash2(seed, 0));
    const fs = DK.size, u = 1000 / fs, lh = fs * 1.2;
    const st = (DK.stage / 20) * 15, ratio = st / 15, boost = 1.0 + (0.6 * (ratio * ratio));
    const ctx = dkCtx(), insts = [], parts = [];
    let nG = 0, kG = 0;
    if (growth) for (const ch of String(text)) if (ch !== '\n' && ch !== ' ' && (glyphFor ? glyphFor(ch) : S1.findGlyph(FONTS, ch))) nG++;
    function root(x, y, angle, pThick, birth, inst) {
      const a0 = angle !== null ? angle : rng() * Math.PI * 2;
      const thick = Math.max(0.5, pThick + (rng() * 0.15 - 0.10));
      const max = ((40 + rng() * 60) * (inst.st / 8.5) * DK.length * (fs / 150) * 1.2 * inst.boost) * 0.6;
      return { pos: { x, y }, vel: { x: Math.cos(a0) * 2, y: Math.sin(a0) * 2 }, segs: [{ x, y }], thick, max, finished: false, birth, inst };
    }
    let cy = 0;
    for (const line of String(text).split('\n')) {
      let cx = 0;
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        const info = glyphFor ? glyphFor(ch) : S1.findGlyph(FONTS, ch);
        const w = info ? info.glyph.advanceWidth * info.scale * fs / 1000 : fs * 0.25;
        if (ch === ' ' || !info) { cx += w; continue; }
        const inst = { info, x: cx * u, y: cy * u, adv: w * u, st, boost };
        if (growth) { const gv = growthAt(growth, kG++, nG), sg = (stageFor(DK.stage, gv) / 20) * 15, rg = sg / 15; inst.st = sg; inst.boost = 1.0 + (0.6 * (rg * rg)); inst.wmul = weightFor(gv); }
        insts.push(inst);
        const tw = Math.max(1, Math.floor(w * 1.5)), th = Math.floor(fs * 1.5);
        const p2d = new Path2D(info.glyph.getPath(0, fs * 0.8, fs).toPathData(3));
        const inc = Math.max(4, Math.floor(Math.max(10, 220 - (inst.st * 11.0)) * (fs / 150)));
        const pts = [];
        for (let i = 0; i < tw * th * 4; i += inc) {
          const k = Math.floor(i / 4), px = k % tw, py = Math.floor(k / tw);
          const hit = i % 4 === 3 ? ctx.isPointInPath(p2d, px + 0.5, py + 0.5)
            : (ctx.isPointInPath(p2d, px + 0.25, py + 0.25) || ctx.isPointInPath(p2d, px + 0.75, py + 0.25) || ctx.isPointInPath(p2d, px + 0.25, py + 0.75) || ctx.isPointInPath(p2d, px + 0.75, py + 0.75));
          if (hit) pts.push({ x: (i / 4) % tw + cx, y: Math.floor((i / 4) / tw) + cy });
        }
        for (const p of pts) if (rng() > 0.99 - (inst.st * 0.005)) parts.push(root(p.x, p.y, null, 1.0, 0, inst));
        cx += w;
      }
      cy += lh;
    }
    let frame = 0, alive = true;
    while (alive && frame < 3000) {
      frame++; alive = false;
      const n = parts.length;
      for (let k = 0; k < n; k++) {
        const P = parts[k];
        if (P.finished || P.segs.length > P.max) { P.finished = true; continue; }
        alive = true;
        const newA = Math.atan2(P.vel.y, P.vel.x) + (rng() - 0.5) * DK.randomness;
        P.vel.x = Math.cos(newA) * 2; P.vel.y = Math.sin(newA) * 2;
        P.pos.x += P.vel.x; P.pos.y += P.vel.y;
        P.segs.push({ x: P.pos.x, y: P.pos.y });
        if (rng() < DK.branch && parts.length < P.inst.st * 120) parts.push(root(P.pos.x, P.pos.y, newA + (rng() - 0.5) * 2, P.thick, frame, P.inst));
      }
    }
    const roots = parts.map(P => ({ segs: P.segs.map(p => ({ x: p.x * u, y: (p.y - 0.8 * fs) * u })), birth: P.birth, thick: P.inst.wmul ? P.thick * P.inst.wmul : P.thick, burn: false, inst: P.inst }));
    const o = S2.opts({ weightUnits: 1.8 * DK.thickness * (fs / 150) * u, taper: 0, minWidth: 0, simplify: 1 });
    return finish({ kind: 'rhizoma', o, insts, roots, joints: [] });
  }
  // one V2 root from point k to nf points shown (the last may be part way along its step)
  function v2Stroke(ctx, sc, R, k, nf) {
    const n = Math.ceil(nf - 1e-9), f = n - nf > 1e-9 ? 1 - (n - nf) : 1, m = f < 1 ? n - 2 : n - 1;   // m: the last point drawn whole
    if (m <= k && f >= 1) return;
    const S = R.segs;
    ctx.beginPath(); ctx.moveTo(S[k].x, S[k].y);
    for (let i = k + 1; i <= m; i++) ctx.lineTo(S[i].x, S[i].y);
    if (f < 1) { const a = S[n - 2], c = S[n - 1]; ctx.lineTo(a.x + (c.x - a.x) * f, a.y + (c.y - a.y) * f); }
    ctx.lineWidth = sc.o.weightUnits * R.thick; ctx.stroke();
  }
  const v2Shown = (sc, R, step) => step == null ? R.segs.length : sc.clock ? sc.clock(R, step) : Math.min(R.segs.length, step - R.birth + 1);
  function drawRhizoma(ctx, sc, step, ink, pick, letters = true, fromOf = null) {
    if (letters) for (const it of sc.insts) { const p = it.info.glyph.getPath(it.x, it.y, 1000); p.fill = ink; p.stroke = null; p.draw(ctx); }
    ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const R of sc.roots) {
      if (pick && !pick(R)) continue;
      const nf = v2Shown(sc, R, step);
      if (nf > 1 + 1e-6) v2Stroke(ctx, sc, R, fromOf ? fromOf(R) : 0, nf);
    }
  }
  // a V2 root keeps one width end to end, so what has grown never changes: while a growth plays, each root's grown length
  // goes into the finished bitmap in stretches of about 32 device pixels (round ends, so the stretches meet as one line),
  // and each frame draws only the stretch still growing at its tip. The finished growth is drawn whole and clean at the end.
  function arcOf(R) {
    if (R._arc) return R._arc;
    const S = R.segs, A = new Float64Array(S.length); for (let i = 1; i < S.length; i++) A[i] = A[i - 1] + Math.hypot(S[i].x - S[i - 1].x, S[i].y - S[i - 1].y);
    return (R._arc = A);
  }
  function bakeRhizoma(c, sc, step, col, roots, cache, T) {
    c.setTransform(...T); c.strokeStyle = col.ink; c.lineCap = 'round'; c.lineJoin = 'round';
    const gap = 32 / T[0];
    for (const R of roots) {
      if (cache.done.has(R)) continue;
      const k = cache.bk.get(R) || 0;
      if ((sc.clockEnd ? sc.clockEnd(R) : R.birth + R.segs.length - 1) <= step) { v2Stroke(c, sc, R, k, R.segs.length); cache.done.add(R); continue; }
      const nf = v2Shown(sc, R, step); if (!(nf > 1 + 1e-6)) continue;
      const n = Math.ceil(nf - 1e-9), m = n - nf > 1e-9 ? n - 2 : n - 1, A = arcOf(R);
      if (m > k && A[m] - A[k] >= gap) { v2Stroke(c, sc, R, k, m + 1); cache.bk.set(R, m); }
    }
  }

  function finish(sc) {
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const it of sc.insts) { const bb = it.info.glyph.getPath(it.x, it.y, 1000).getBoundingBox(); b.x0 = Math.min(b.x0, bb.x1); b.y0 = Math.min(b.y0, bb.y1); b.x1 = Math.max(b.x1, bb.x2); b.y1 = Math.max(b.y1, bb.y2); }
    let total = 0;
    for (const R of sc.roots) { total = Math.max(total, R.birth + R.segs.length); for (const p of R.segs) { if (p.x < b.x0) b.x0 = p.x; if (p.x > b.x1) b.x1 = p.x; if (p.y < b.y0) b.y0 = p.y; if (p.y > b.y1) b.y1 = p.y; } }
    if (!isFinite(b.x0)) { b.x0 = 0; b.y0 = -800; b.x1 = 1000; b.y1 = 200; }
    b.x0 -= 60; b.y0 -= 60; b.x1 += 60; b.y1 += 60;
    sc.b = b; sc.total = total; sc.nRoots = sc.roots.length;
    return sc;
  }
  function grow(text, face, seed, growth, opts) {
    if (growth && GSCALE[face]) growth = Object.assign({}, growth, { scale: GSCALE[face] });
    if (face === 'SMOKE') return paced(makeSceneOriginal(text, seed, growth), seed, face);
    if (face === 'RHIZOMA') return paced(growRhizoma(text, seed, null, growth), seed, face);
    const sc = S2.grow(FONTS, text, Object.assign({}, opts || PRESETS[face], { seed }, growth ? { growth } : {}));
    sc.kind = 'v2';
    sc.b = { x0: sc.b.x0 - 60, y0: sc.b.y0 - 60, x1: sc.b.x1 + 60, y1: sc.b.y1 + 60 };
    return paced(sc, seed, face);
  }
  // how every growth on the page plays: each root on a clock of its own, the rule How a Letter Grows plays by. A trunk starts
  // a moment early or late, a branch the moment its parent's tip reaches the point it grows from, and each root grows at a
  // pace of its own (0.6 to 1.45 times the mean, from the seed) along a growth curve: it comes out of its start, grows, and
  // settles as it reaches its length. The curve is symmetric, so a root is as much drawn while it grows as at one speed: a
  // frame costs what it did (How a Letter Grows is drawn as SVG and can afford a longer settle). The whole growth is then
  // laid over the timing it always had: at every moment as much root has grown as before, so the start is no quicker and the
  // end no longer, while each root keeps its own speed inside that. Playback only: every shape, font and file is the
  // engine's, unchanged.
  const SEQ = false;   // prototype face sequences, off by default
  const PACE = [0.6, 1.45], EZ = [0.42, 0, 0.58, 1], EN = 1024, WS = 16, TW = [0.65, 0.75];   // TW: the share of width in a root's pace, and in when a trunk starts
  const bzq = (s, p, q) => 3 * (1 - s) * (1 - s) * s * p + 3 * (1 - s) * s * s * q + s * s * s;
  function bezier(x, a, b) { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bzq(m, EZ[a], EZ[a + 2]) < x) lo = m; else hi = m; } return bzq((lo + hi) / 2, EZ[b], EZ[b + 2]); }
  const EASE = Float32Array.from({ length: EN + 1 }, (_, i) => bezier(i / EN, 0, 1));
  function easeAt(x) { if (x <= 0) return 0; if (x >= 1) return 1; const f = x * EN, i = f | 0; return EASE[i] + (EASE[i + 1] - EASE[i]) * (f - i); }
  const easeInv = q => q <= 0 ? 0 : q >= 1 ? 1 : bezier(q, 1, 0);
  // the growths that go on live (the page's roots, the R's spread) keep the rule tip by tip: each root grows at a pace of
  // its own, from its seed and number, averaging the pace they had, and slows over its last stretch before it stops. Every
  // tip still takes one step a tick and glides along it; a faster root takes longer steps, so no tip ever waits or jumps
  const tipPace = (seed, id) => (PACE[0] + (PACE[1] - PACE[0]) * ((S1.hash2(seed >>> 0, id + 0x5EED) >>> 0) / 4294967296)) * 2 / (PACE[0] + PACE[1]);
  const tipRate = t => t.pace * Math.min(1, 0.3 + 0.7 * Math.max(0, t.life - t.age) / 30);
  function paced(sc, seed, face) {
    sc.face = face;
    const roots = sc.kind === 'smoke' ? sc.items.flatMap(it => it.roots) : sc.roots;
    if (!roots.length) return sc;
    // a branch's parent: the engine names it; otherwise it is the root, in the same letter, with a step where the branch starts
    const T = new Map(), base = S1.hash2(seed >>> 0, 0x9ACE), group = new Map(), maps = new Map();
    const key = p => (Math.round(p.x * 64) + 1048576) * 2097152 + Math.round(p.y * 64) + 1048576;
    if (sc.kind === 'smoke') sc.items.forEach(it => it.roots.forEach(R => group.set(R, it.roots))); else roots.forEach(R => group.set(R, roots));
    const parentOf = R => { const g = group.get(R); let at = maps.get(g);
      if (!at) { maps.set(g, at = new Map()); for (const Q of g) for (let j = 1; j < Q.segs.length; j++) { const k = key(Q.segs[j]); if (!at.has(k)) at.set(k, [Q, j]); } }
      const m = at.get(key(R.segs[0])); return m && m[0] !== R ? m : null; };
    const total = Math.max(1, ...roots.map(R => R.birth + R.segs.length)); let end = 1, sum = 0;
    // thick first, thin last: each root's width (its thickness at its letter's line weight) ranks it in the growth, and the
    // rank sets most of its pace and, for a trunk, its place in the order trunks set out: the widest roots go first and
    // fastest, the finest last and slowest, as a root system lays down its main roots before the fine ones. A share is
    // left to chance, so roots of one width never move as one. The trunks keep the start times they had, handed out by width.
    const hash = (i, k) => (S1.hash2(base, i + k) >>> 0) / 4294967296, item = new Map();
    if (sc.kind === 'smoke') sc.items.forEach(it => it.roots.forEach(R => item.set(R, it)));
    const wid = R => (R.thick || 1) * (sc.kind === 'smoke' ? ((item.get(R).o || sc.o).weightUnits || 1) : (R.inst && R.inst.wmul) || 1);
    const rank = new Map(), NR = roots.length;
    roots.map((R, i) => [wid(R), hash(i, 1), R]).sort((x, y) => x[0] - y[0] || x[1] - y[1]).forEach(([, , R], k) => rank.set(R, NR > 1 ? k / (NR - 1) : 1));
    const trunk = R => sc.kind === 'v2' ? !R.parent : !(R.birth > 0) || !!R.trunk, start = new Map();
    { const ts = roots.map((R, i) => [R, i]).filter(([R]) => trunk(R)), at = ts.map(([R, i]) => R.birth + hash(i, 77771) * 0.06 * total).sort((x, y) => x - y);
      ts.sort((x, y) => (TW[1] * rank.get(y[0]) + (1 - TW[1]) * hash(y[1], 31337)) - (TW[1] * rank.get(x[0]) + (1 - TW[1]) * hash(x[1], 31337))).forEach(([R], k) => start.set(R, at[k])); }
    // PROTOTYPE (off unless the page is opened with ?motion=next): each face sets its trunks out in an order of its own.
    // SG Drag: the way the growth flows, so the word fills like a current passing through it. SG Roses: around each letter's
    // outline, clockwise from the top, letters in reading order, so a wave travels round every letter.
    if (SEQ && (face === 'DRAG' || face === 'ROOT')) {
      const tr = roots.map((R, i) => [R, i]).filter(([R]) => trunk(R)), key = new Map();
      if (face === 'DRAG') {
        let dx = 0, dy = 0; for (const R of roots) { const a = R.segs[0], b = R.segs[R.segs.length - 1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1; dx += (b.x - a.x) / L; dy += (b.y - a.y) / L; }
        let L = Math.hypot(dx, dy); if (L < 0.2 * roots.length) { dx = 1; dy = 0; L = 1; } dx /= L; dy /= L;
        tr.forEach(([R]) => key.set(R, R.segs[0].x * dx + R.segs[0].y * dy));
      } else {
        const groups = new Map(); for (const [R] of tr) { const g = R.inst || 0; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(R); }
        const order = [...groups.keys()].sort((p, q) => (p.x || 0) - (q.x || 0));
        order.forEach((g, li) => { const rs = groups.get(g), cx = rs.reduce((s, R) => s + R.segs[0].x, 0) / rs.length, cy = rs.reduce((s, R) => s + R.segs[0].y, 0) / rs.length;
          rs.forEach(R => { const th = Math.atan2(R.segs[0].y - cy, R.segs[0].x - cx), u = (((th + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
            key.set(R, 0.35 * li / Math.max(1, order.length) + 0.65 * u); }); });
      }
      const ks = [...key.values()], lo = Math.min(...ks), hi = Math.max(...ks), spread = face === 'DRAG' ? 0.4 : 0.45;
      tr.forEach(([R, i]) => start.set(R, (key.get(R) - lo) / ((hi - lo) || 1) * spread * total + hash(i, 4242) * 0.03 * total));
    }
    roots.map((R, i) => [R, i]).sort((a, b) => a[0].birth - b[0].birth).forEach(([R, i]) => {
      const u = TW[0] * rank.get(R) + (1 - TW[0]) * hash(i, 1);
      const len = Math.max(1, R.segs.length - 1), dur = len / (PACE[0] + (PACE[1] - PACE[0]) * u);
      let P = R.parent || null, j = R.at;
      if (!P && R.birth > 0 && !R.trunk && sc.kind !== 'v2') { const m = parentOf(R); if (m) [P, j] = m; }   // the engine names every branch's parent
      const pt = P && T.get(P);
      const t0 = pt ? pt.t0 + pt.dur * easeInv(j / Math.max(1, P.segs.length - 1)) : start.has(R) ? start.get(R) : R.birth + hash(i, 77771) * 0.06 * total;
      T.set(R, { t0, dur, len }); end = Math.max(end, t0 + dur); sum += len;
    });
    // the timing it always had: how much of the growth (by length) stood at each step, one step a tick, and the same on
    // the roots' own clocks; W maps a step to the moment on their clocks when as much had grown
    const G = 256, old = new Float64Array(G + 1), own = new Float64Array(G + 1), W = new Float64Array(G + 1), N = roots.length;
    const RB = new Float64Array(N), RL = new Float64Array(N), R0 = new Float64Array(N), RD = new Float64Array(N);
    roots.forEach((R, i) => { const c = T.get(R); RB[i] = R.birth; RL[i] = c.len; R0[i] = c.t0; RD[i] = c.dur; });
    for (let i = 0; i < N; i++) {                                    // each root adds to the steps it grows through, and all of itself after
      const b = RB[i], l = RL[i], t0 = R0[i], d = RD[i];
      for (let k = Math.max(0, Math.floor(b / total * G)); k <= G; k++) { const s = k / G * total - b; if (s <= 0) continue; if (s >= l) { for (; k <= G; k++) old[k] += l; break; } old[k] += s; }
      for (let k = Math.max(0, Math.floor(t0 / end * G)); k <= G; k++) { const x = (k / G * end - t0) / d; if (x <= 0) continue; if (x >= 1) { for (; k <= G; k++) own[k] += l; break; } own[k] += l * easeAt(x); }
    }
    for (let k = 0; k <= G; k++) { old[k] /= sum; own[k] /= sum; }
    for (let k = 0, i = 0; k <= G; k++) {
      const q = Math.min(old[k], own[G]); while (i < G && own[i + 1] < q) i++;
      const d = own[i + 1] - own[i]; W[k] = k === G ? end : (i + (d > 0 ? Math.min(1, Math.max(0, (q - own[i]) / d)) : 0)) / G * end;
    }
    for (let k = 1; k <= G; k++) if (W[k] < W[k - 1]) W[k] = W[k - 1];
    // and smoothed, so that when a root starts or stops nothing else lurches with it: speeds change over a few frames
    { const r = Math.ceil(WS * 3), g = Array.from({ length: 2 * r + 1 }, (_, m) => Math.exp(-((m - r) ** 2) / (2 * WS * WS))), gs = g.reduce((x, y) => x + y, 0);
      const at = k => k < 0 ? 2 * W[0] - W[-k] : k > G ? 2 * W[G] - W[2 * G - k] : W[k], S = new Float64Array(G + 1);
      for (let k = 0; k <= G; k++) { let v = 0; for (let m = -r; m <= r; m++) v += g[m + r] * at(k + m); S[k] = v / gs; }
      W.set(S); }
    const warp = s => { if (s <= 0) return W[0]; const f = s / total * G; if (f >= G) return end; const k = f | 0; return W[k] + (W[k + 1] - W[k]) * (f - k); };
    sc.warp = warp;
    // how many of a root's points show at a step, counting the one its tip is on the way to as a fraction, so a tip moves on
    // every frame however slowly it grows (whole steps would stand and jump)
    sc.clock = (R, step) => { const c = T.get(R); return c ? 1 + c.len * easeAt((warp(step) - c.t0) / c.dur) : Math.min(R.segs.length, step - R.birth + 1); };
    const stepAt = t => { let lo = 0, hi = G; while (lo < hi) { const m = (lo + hi) >> 1; if (W[m] >= t - 1e-9) hi = m; else lo = m + 1; }
      if (lo > 0 && W[lo] > W[lo - 1]) return Math.min(total, (lo - 1 + (t - W[lo - 1]) / (W[lo] - W[lo - 1])) / G * total); return Math.min(total, lo / G * total); };
    // the step each root is whole (from then on it is drawn from the finished bitmap), and the step it first shows (SG Smoke
    // widens a parent to carry a branch from that step); both found on the clock itself, so they agree with it to the step
    const ends = new Map();
    for (const [R, c] of T) {
      let e = Math.ceil(stepAt(c.t0 + c.dur)); while (e < total && sc.clock(R, e) < R.segs.length - 1e-9) e++; while (e > 0 && sc.clock(R, e - 1) >= R.segs.length - 1e-9) e--; ends.set(R, e);
      if (sc.kind !== 'smoke') continue;
      let s = Math.max(0, Math.floor(stepAt(c.t0)) - 1); while (s < total && !(sc.clock(R, s) > 1 + 1e-9)) s++; while (s > 0 && sc.clock(R, s - 1) > 1 + 1e-9) s--; R._show = s;
    }
    sc.clockEnd = R => ends.has(R) ? ends.get(R) : R.birth + R.segs.length - 1;
    if (window.__rsProbe) window.__rsProbe(sc, roots);             // the build checks listen here; nothing on the live page does
    return sc;
  }
  function fit(w, h, sc, emMax, pad) {
    const bw = sc.b.x1 - sc.b.x0, bh = sc.b.y1 - sc.b.y0;
    const s = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, emMax / 1000);
    return { s, tx: (w - bw * s) / 2 - sc.b.x0 * s, ty: (h - bh * s) / 2 - sc.b.y0 * s };
  }
  // while a growth plays, the letters and every root that has finished growing are drawn once into a bitmap the size of the
  // canvas, at the same resolution, and each frame copies that bitmap and draws only the roots still growing. The picture is
  // the same; a frame late in a big growth costs a fraction of what it did, so scrolling past a growing figure stays smooth.
  function allRoots(sc) { return sc.kind === 'smoke' ? sc.items.flatMap(it => it.roots) : sc.roots; }
  function drawPart(ctx, sc, step, col, pick, letters) {
    if (sc.kind === 'smoke') drawOriginal(ctx, sc, step, col.ink, pick, letters);
    else if (sc.kind === 'rhizoma') drawRhizoma(ctx, sc, step, col.ink, pick, letters);
    else S2.draw(ctx, pick ? { o: sc.o, insts: letters ? sc.insts : [], roots: sc.roots.filter(pick), clock: sc.clock } : sc, step, col.ink, col.ground);
  }
  // a dot on every tip still growing, in the scene's tipColour (05's side-by-side), as wide as its root: the eye follows how
  // tips move, and sees which roots are still growing, the heavy ones or the fine ones
  function tipDots(ctx, sc, step, rCss, s) {
    if (!sc.tipColour || step == null || step >= sc.total) return;
    ctx.fillStyle = sc.tipColour;
    const one = (R, S, ox, oy, w) => { const r = (rCss * 0.5 + 0.55 * w * s) / s; const nf = sc.clock ? sc.clock(R, step) : Math.min(R.segs.length, step - R.birth + 1); if (!(nf > 1 + 1e-6) || nf >= R.segs.length - 1e-6) return;
      const n = Math.ceil(nf - 1e-9), f = n - nf > 1e-9 ? 1 - (n - nf) : 1, a = S[n - 2], c = S[n - 1];
      ctx.beginPath(); ctx.arc(a.x + (c.x - a.x) * f + ox, a.y + (c.y - a.y) * f + oy, r, 0, 2 * Math.PI); ctx.fill(); };
    if (sc.kind === 'smoke') sc.items.forEach(it => { const o = it.o || sc.o, base = o.weightUnits != null ? o.weightUnits : 1.8 * o.weight * S1.K; it.roots.forEach(R => one(R, smoothed(R), it.x, it.y, base * R.thick)); });
    else if (sc.kind === 'rhizoma') sc.roots.forEach(R => one(R, R.segs, 0, 0, sc.o.weightUnits * R.thick));
  }
  function paint(ctx, w, h, dpr, sc, step, col, emMax, pad, clear, cache) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (clear) ctx.clearRect(0, 0, w, h); else { ctx.fillStyle = col.ground; ctx.fillRect(0, 0, w, h); }
    const v = fit(w, h, sc, emMax, pad), T = [v.s * dpr, 0, 0, v.s * dpr, v.tx * dpr, v.ty * dpr];
    const roots = cache && step != null && step < sc.total ? allRoots(sc) : null;
    if (!roots || roots.some(R => R.burn)) { if (cache) cache.sc = null; ctx.setTransform(...T); drawPart(ctx, sc, step, col, null, true); tipDots(ctx, sc, step, 2.4, v.s); return; }
    const W = Math.round(w * dpr), H = Math.round(h * dpr), key = [W, H, T.join(','), col.ink].join('|');
    if (cache.sc !== sc || cache.key !== key) {
      if (!cache.cv) cache.cv = document.createElement('canvas');
      cache.cv.width = W; cache.cv.height = H; cache.sc = sc; cache.key = key; cache.done = new Set(); cache.bk = new Map();
      const c = cache.cv.getContext('2d'); c.setTransform(...T); drawPart(c, sc, null, col, () => false, true);
    }
    if (sc.kind === 'rhizoma') {
      bakeRhizoma(cache.cv.getContext('2d'), sc, step, col, roots, cache, T);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cache.cv, 0, 0);
      ctx.setTransform(...T); drawRhizoma(ctx, sc, step, col.ink, R => !cache.done.has(R), false, R => cache.bk.get(R) || 0); tipDots(ctx, sc, step, 2.4, v.s); return;
    }
    const fresh = roots.filter(R => !cache.done.has(R) && (sc.clockEnd ? sc.clockEnd(R) : R.birth + R.segs.length - 1) <= step);
    if (fresh.length) { const c = cache.cv.getContext('2d'); c.setTransform(...T); const f = new Set(fresh); drawPart(c, sc, null, col, R => f.has(R), false); fresh.forEach(R => cache.done.add(R)); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cache.cv, 0, 0);
    ctx.setTransform(...T); drawPart(ctx, sc, step, col, R => !cache.done.has(R), false);
    tipDots(ctx, sc, step, 2.4, v.s);
  }
  function svgOf(sc, ink, mode, name) {
    if (sc.kind === 'smoke') return mode === 'united' ? svgUnitedOriginal(sc, ink) : svgLayersOriginal(sc, ink);
    return S2.svg(sc, ink, mode, name);
  }
  // canvas sizes come from a ResizeObserver, so drawing a frame never has to wait for the page to lay itself out
  const SIZES = new WeakMap();
  const sizeRO = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => SIZES.set(e.target, [e.contentRect.width, e.contentRect.height]))) : null;
  function sizeCanvas(cv) {
    let wh = SIZES.get(cv);
    if (!wh || !wh[0]) { wh = [cv.clientWidth, cv.clientHeight]; if (sizeRO) { SIZES.set(cv, wh); sizeRO.observe(cv); } }
    const dpr = Math.min(window.devicePixelRatio || 1, 3), w = wh[0], h = wh[1];
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    return { dpr, w, h };
  }
  // when the visitor last scrolled, moved or typed: growth that can wait does, and a growing figure draws every other frame
  let busyAt = 0, scrollAt = 0; const busy = () => { busyAt = performance.now(); };
  ['wheel', 'pointermove', 'pointerdown', 'touchmove', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, busy, { passive: true, capture: true }));   // a click often starts a growth: nothing grows ahead for a moment after it
  window.addEventListener('scroll', () => { busyAt = scrollAt = performance.now(); }, { passive: true });
  // a growth plays two steps a sixtieth of a second, which suits most, held to at least 1.6 s so a small growth (SG Flame's
  // 한, a card's word) has time to set out, grow and settle, and to at most 5 s so a huge one (SG Rhizoma V2 at 20) never drags
  const playSecs = T => Math.max(1.6, Math.min(5, T / 120));
  function player(cv, emMax, pad, transparent, after, pace = 1) {
    let sc = null, col = null, step = 0, pos = 0, raf = 0, done = null; const cache = {};
    const finish = () => { if (raf) { raf = 0; growing--; } const f = done; done = null; if (f) f(); };
    // how long a growth plays (playSecs). Timed by the clock, not by frames: as long on a 120 Hz screen as on a 60 Hz one, and a
    // dropped frame is caught up (up to two frames' worth) so the roots keep their speed. Steps are not rounded: tips move every frame.
    let odd = false, lastT = 0; function frame(now) { const dt = lastT ? Math.min(34, Math.max(0, now - lastT)) : 1000 / 60; lastT = now;
      pos += sc.total / (playSecs(sc.total) * 60) * pace * dt / (1000 / 60); step = Math.min(sc.total, pos); odd = !odd; if (odd && step < sc.total && performance.now() - scrollAt < 200) { raf = requestAnimationFrame(frame); return; } const d = sizeCanvas(cv); paint(cv.getContext('2d'), d.w, d.h, d.dpr, sc, step, col(), emMax, pad, transparent, cache); if (step < sc.total) raf = requestAnimationFrame(frame); else finish(); }
    return {
      play(s, c, fin) {
        sc = s; col = c; if (raf) { cancelAnimationFrame(raf); raf = 0; growing--; } done = fin || null; if (after) after();
        if (reduce) { step = s.total; const d = sizeCanvas(cv); paint(cv.getContext('2d'), d.w, d.h, d.dpr, sc, step, col(), emMax, pad, transparent); finish(); return; }
        step = 0; pos = 0; lastT = 0; cache.sc = null; growing++; raf = requestAnimationFrame(frame);
      },
      redraw() { if (sc && !raf) { const d = sizeCanvas(cv); paint(cv.getContext('2d'), d.w, d.h, d.dpr, sc, step, col(), emMax, pad, transparent); } if (after) after(); },
      stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; growing--; } },
      get scene() { return sc; },
    };
  }

  // ---------- a growth, once grown, is kept: a label, card or chapter that grew before grows again at once. The ones a
  // visitor is likely to meet next are grown ahead, one at a time, while the page is idle.
  const SCN = new Map();
  function cached(text, face, seed, growth, opts) {
    const k = face + (opts ? '*' : '') + '|' + seed + '|' + (growth ? growth.from + '>' + growth.to : '') + '|' + text;
    let s = SCN.get(k);
    if (s) { SCN.delete(k); SCN.set(k, s); return s; }
    s = grow(text, face, seed, growth, opts); s.key = k; SCN.set(k, s);
    if (SCN.size > 72) SCN.delete(SCN.keys().next().value);
    return s;
  }
  const ahead = []; let growing = 0;   // growths drawing right now; growing ahead waits for them
  const ric = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 4000 }) : f => setTimeout(f, 90);
  // a scene drawn once, fully grown, into a tiny canvas: the smoothing, where each root leaves its letter, the widths it
  // carries and the outlines are worked out then, in idle time, so the first frame of the growth costs no more than the next
  let _wc = null;
  function warm(sc) {
    if (!sc || sc._warm) return sc; sc._warm = true;
    if (!_wc) { const c = document.createElement('canvas'); c.width = 4; c.height = 4; _wc = c.getContext('2d'); }
    _wc.setTransform(0.001, 0, 0, 0.001, 0, 0); drawScene(_wc, sc, null, '#000', '#fff');
    return sc;
  }
  function growAhead(list) { const was = ahead.length; ahead.push(...list); if (!was) ric(pump); }
  // a growth ahead takes the main thread for a tenth of a second or so: it waits until the visitor has stopped scrolling or
  // moving for a moment, and the next one waits a little more, so scrolling never stutters for it
  function pump() {
    if (growing > 0) { setTimeout(() => ric(pump), 250); return; }
    if (performance.now() - busyAt < 700) { setTimeout(() => ric(pump), 400); return; }
    const job = ahead.shift(); if (job && FONTS) { try { warm(cached.apply(null, job)); } catch (e) { /* grown when it is needed instead */ } }
    if (ahead.length) setTimeout(() => ric(pump), 250);
  }


  // ---------- the interface
  const FACE = { smoke: 'SMOKE', drag: 'DRAG', flame: 'FLAME', v2: 'RHIZOMA', rhizoma: 'RHIZOMA', roses: 'ROOT', tangle: 'TANGLE' };
  const FONT_SEEDS = {"SMOKE": 9639, "DRAG": 33, "FLAME": 22, "RHIZOMA": 31, "ROOT": 202, "TANGLE": 22};
  const here = (document.currentScript && document.currentScript.src) || location.href;
  let base = new URL('../', here).href;                               // the folder that holds fonts/ (the site this script came from)
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.head.appendChild(s); });
  const fetchFont = u => fetch(new URL(u, base)).then(r => { if (!r.ok) throw new Error(u); return r.arrayBuffer(); }).then(b => opentype.parse(b));
  let ot = null, fell = null, song = null;
  function fonts(hangul) {                                             // IM Fell English always; Song Myung only once a text needs it
    ot = ot || (window.opentype ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js'));
    fell = fell || ot.then(() => fetchFont('fonts/im-fell-english.woff'));
    if (hangul) song = song || ot.then(() => fetchFont('fonts/song-myung-korean.woff'));
    return Promise.all([fell, hangul ? song : (song || fell)]).then(f => { FONTS = f; });
  }
  function glyphBox(sc) {
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const add = p => { const q = p.getBoundingBox(); b.x0 = Math.min(b.x0, q.x1); b.y0 = Math.min(b.y0, q.y1); b.x1 = Math.max(b.x1, q.x2); b.y1 = Math.max(b.y1, q.y2); };
    if (sc.kind === 'smoke') sc.items.forEach(it => add(it.path)); else sc.insts.forEach(it => add(it.info.glyph.getPath(it.x, it.y, 1000)));
    return b;
  }
  function growthOf(v) {                                               // "10", "2-18" or { from, to }; 10 is each face as tuned
    if (v == null || v === '') return null;
    if (typeof v === 'object') return v.from === 10 && v.to === 10 ? null : { from: +v.from, to: +v.to };
    const n = String(v).split(/[-,> ]+/).map(Number).filter(Number.isFinite), from = n[0], to = n.length > 1 ? n[1] : n[0];
    return from == null || (from === 10 && to === 10) ? null : { from: Math.max(0, Math.min(20, from)), to: Math.max(0, Math.min(20, to)) };
  }
  function groundOf(el) {                                              // the colour behind the element (a root that burns cuts into it)
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(.*,\s*0\)$|transparent/.test(c)) return c; }
    return '#ffffff';
  }
  const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;
  // grow(element, options): draws the element's text grown in an SG face, over the element, and plays the growth. The text
  // stays in the page (for readers, search and copying) and is only made transparent. Returns { replay, stop, redraw, remove }.
  function growEl(el, o) {
    o = Object.assign({}, o);
    const ds = el.dataset, face = FACE[String(o.face || ds.sgRhizoma || 'smoke').toLowerCase()] || 'SMOKE';
    const seed = +(o.seed || ds.seed) || FONT_SEEDS[face] || 1, growth = growthOf(o.growth != null ? o.growth : ds.growth);
    const text = o.text || ds.text || el.textContent.replace(/\s+/g, ' ').trim();
    const cs = getComputedStyle(el), ink = o.colour || o.color || ds.colour || ds.color || cs.color, ground = o.ground || ds.ground || groundOf(el);
    if (cs.position === 'static') el.style.position = 'relative';
    el.style.color = 'transparent'; el.style.webkitTextFillColor = 'transparent';
    const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
    Object.assign(cv.style, { position: 'absolute', pointerEvents: 'none', userSelect: 'none', zIndex: '0' });
    el.appendChild(cv);
    let sc = null, p = null, alive = true;
    const col = () => ({ ink, ground });
    function place() {                                                 // the grown word sits on the element's text: left edge and middle of the line
      if (!sc) return;
      const fsz = parseFloat(getComputedStyle(el).fontSize) || 32, s = fsz * (+(o.scale || ds.scale) || 1) / 1000;
      const gb = glyphBox(sc), W = Math.ceil((sc.b.x1 - sc.b.x0) * s) + 2, H = Math.ceil((sc.b.y1 - sc.b.y0) * s) + 2;
      const pl = parseFloat(getComputedStyle(el).paddingLeft) || 0, pt = parseFloat(getComputedStyle(el).paddingTop) || 0, ch = el.clientHeight - pt - (parseFloat(getComputedStyle(el).paddingBottom) || 0);
      const left = pl - (gb.x0 - sc.b.x0) * s, top = pt + ch / 2 - ((gb.y0 + gb.y1) / 2 - sc.b.y0) * s;
      Object.assign(cv.style, { left: left.toFixed(1) + 'px', top: top.toFixed(1) + 'px', width: W + 'px', height: H + 'px' });
      SIZES.set(cv, [W, H]);
      p = p || player(cv, fsz * (+(o.scale || ds.scale) || 1) + 0.5, 1, true);
    }
    const ready = fonts(HANGUL.test(text)).then(() => { if (!alive) return; sc = cached(text, face, seed, growth); place(); });
    const api = {
      replay() { return ready.then(() => { if (alive && p) { place(); p.play(sc, col); } }); },
      stop() { if (p) p.stop(); },
      redraw() { if (p && sc) { place(); p.redraw(); } },
      remove() { alive = false; if (p) p.stop(); cv.remove(); el.style.color = ''; el.style.webkitTextFillColor = ''; },
      ready,
    };
    if (window.ResizeObserver) new ResizeObserver(() => api.redraw()).observe(el);
    if (o.replayOnClick || 'replay' in ds) { el.style.cursor = 'pointer'; el.addEventListener('click', () => api.replay()); }
    return api;
  }
  // every element with data-sg-rhizoma grows when it first comes into view
  function auto() {
    const els = [...document.querySelectorAll('[data-sg-rhizoma]')].filter(el => !el._sgr);
    const start = el => { el._sgr = growEl(el, {}); el._sgr.replay(); };
    if (!('IntersectionObserver' in window)) { els.forEach(start); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); start(en.target); } }), { threshold: 0.2 });
    els.forEach(el => { el._sgr = true; io.observe(el); });
  }
  window.SGRhizoma = {
    version: '19.15',
    faces: ['smoke', 'roses', 'v2', 'drag', 'flame', 'tangle'],
    grow(el, o) { const a = growEl(typeof el === 'string' ? document.querySelector(el) : el, o || {}); a.replay(); return a; },
    config(c) { if (c && c.base) base = new URL(c.base, location.href).href; return { base }; },
    scan: auto,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
