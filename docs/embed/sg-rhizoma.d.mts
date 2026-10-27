/* SG Rhizoma Engine (embed) v19.19, types. https://github.com/sativus-gourd/rhizoma-smoke */
export type Face = 'smoke' | 'roses' | 'v2' | 'rhizoma' | 'drag' | 'flame' | 'tangle';
export type Growth = number | string | { from: number; to: number };
export interface Options {
  /** The typeface; default 'smoke'. */
  face?: Face;
  /** The seed; each face has its own default. */
  seed?: number;
  /** 10 is each face as tuned; a number from 0 to 20, "2-18", or { from, to }. */
  growth?: Growth;
  colour?: string;
  color?: string;
  /** The colour behind the element, which burning roots cut into; read from the page when left out. */
  ground?: string;
  /** Multiplies the word's size. */
  scale?: number;
  /** 0.5 to 2, or 'fine', 'earthy' (the face's own, the default) or 'heavy'. */
  weight?: number | 'fine' | 'earthy' | 'heavy';
  /** The word to grow; the element's own text when left out. */
  text?: string;
  /** The canvas fills the element, with the word at one size in the middle and the roots running past it. */
  field?: boolean;
  /** With field: the element is the screen and the canvas stays fixed to it. */
  fixed?: boolean;
  /** With field: the word's share of the width. */
  size?: number;
  /** Highest device pixel ratio drawn; default 2. */
  dpr?: number;
  /** Speed of growth; 1 is as tuned. */
  pace?: number;
  /** Grow to this growth, 0 to 20: from nothing when no `growth` is given, or on from that growth. */
  climb?: number;
  /** How long the climb takes in seconds; default 40. With nothing drawn yet, the word grows straight to `climb` over these seconds, as one growth. */
  seconds?: number;
  /** Click to grow again. */
  replay?: boolean;
  /** Play when ready; default true. */
  autoplay?: boolean;
}
export interface Controller {
  /** Resolves true at the first frame, false if the fonts or the build failed (the heading text is then back in the page). */
  readonly ready: Promise<boolean>;
  readonly growth: number | null;
  readonly state: 'idle' | 'grow' | 'prep' | 'release' | 'failed' | 'removed';
  readonly element: HTMLElement;
  replay(): Promise<boolean>;
  /** Continues the growth to n; a lower n plays that growth whole. */
  setGrowth(n: number | string, options?: { seconds?: number }): Promise<boolean>;
  /** Rises to growth n over the given seconds, as one growth: the roots on screen stay and every tip moves at one speed. */
  climb(n: number, options?: { seconds?: number }): Promise<boolean>;
  /** The roots withdraw and the word stays; fires sg:released. */
  release(options?: { seconds?: number }): Promise<boolean>;
  /** A PNG Blob (transparent unless background is true), or an SVG string with type 'svg'. */
  snapshot(options?: { type?: 'png' | 'svg'; mode?: string; background?: boolean }): Promise<Blob | string | null>;
  redraw(): void;
  stop(): void;
  setWeight(weight: Options['weight']): void;
  setColour(colour: string): void;
  remove(): void;
}
/** The events the element fires (they bubble): sg:ready, sg:level, sg:settled, sg:released, sg:error. */
export interface Events {
  'sg:ready': CustomEvent<{ growth: number | null; face: string }>;
  'sg:level': CustomEvent<{ growth: number | null; roots: number }>;
  'sg:settled': CustomEvent<{ growth: number | null }>;
  'sg:released': CustomEvent<{ growth: number | null }>;
  'sg:error': CustomEvent<{ stage: string; error: string }>;
}
export interface Api {
  readonly version: string;
  readonly faces: string[];
  grow(element: HTMLElement | string, options?: Options): Controller;
  field(element: HTMLElement | string, options?: Options): Controller;
  /** Where the fonts are read from: base is the folder that holds fonts/. */
  config(settings?: { base?: string; fonts?: { latin?: string; hangul?: string } }): { base: string; fonts: { latin: string; hangul: string } } | undefined;
  /** Grows every [data-sg-rhizoma] element as it comes into view. */
  scan(): void;
}
declare const SGRhizoma: Api;
export default SGRhizoma;
export declare const grow: Api['grow'], field: Api['field'], config: Api['config'], scan: Api['scan'], version: string;
