import type { ExtractPropTypes, PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';

// A commenter's identicon, drawn from the Worker's avatar seed — a
// non-reversible handle for their address, so the same person keeps the
// same face across posts while the address never leaves the Worker.
// Deterministic and dependency-free: a mirrored 5×5 bit field over a
// two-stop gradient, hue picked from the seed.
class $CommentAvatar {
  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      seed: { type: String as PropType<string>, required: true },
      name: { type: String as PropType<string>, required: true },
      size: { type: Number as PropType<number> },
    });
  }

  static get propsDefaults() {
    return { size: 34 };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  /** The 5×5 grid's cell pitch in viewBox units. */
  static get CELL_PITCH() {
    return 2.8;
  }

  /** Where the grid starts inside the 20×20 viewBox. */
  static get CELL_INSET() {
    return 3;
  }

  constructor(public props: CommentAvatar.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $CommentAvatar;
  }

  // DERIVED — plain getters, zero bytes per instance
  get size() {
    return this.props.size;
  }

  /** FNV-1a over the seed (the seed is already a digest; this only spreads
   *  it into the few small numbers the drawing needs) */
  get hashed() {
    let hash = 0x811c9dc5;
    const source = this.props.seed || this.props.name || 'anonymous';
    for (let index = 0; index < source.length; index++) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash;
  }

  get hue() {
    return this.hashed % 360;
  }

  get secondHue() {
    return (this.hue + 42 + (this.hashed % 60)) % 360;
  }

  /** 5 columns × 5 rows, mirrored across the vertical axis: 15 bits decide
   *  the pattern, so it reads as a face/glyph rather than noise */
  get cells() {
    const bits: CommentAvatar.Cell[] = [];
    let state = this.hashed || 1;
    const next = () => {
      // xorshift32 — same seed, same picture, forever
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 0xffffffff;
    };
    for (let column = 0; column < 3; column++) {
      for (let row = 0; row < 5; row++) {
        if (next() > 0.5) continue;
        bits.push({ x: column, y: row });
        if (column < 2) bits.push({ x: 4 - column, y: row });
      }
    }
    return bits;
  }

  get initial() {
    return (this.props.name || '?').trim().charAt(0).toUpperCase();
  }

  get ariaLabel() {
    return `${this.props.name}'s avatar`;
  }

  get gradientId() {
    return `ca-${this.props.seed || this.initial}`;
  }

  get gradientFill() {
    return `url(#${this.gradientId})`;
  }

  get firstStopColor() {
    return `hsl(${this.hue} 68% 52%)`;
  }

  get secondStopColor() {
    return `hsl(${this.secondHue} 70% 44%)`;
  }

  cellX(cell: CommentAvatar.Cell) {
    return this.self.CELL_INSET + cell.x * this.self.CELL_PITCH;
  }

  cellY(cell: CommentAvatar.Cell) {
    return this.self.CELL_INSET + cell.y * this.self.CELL_PITCH;
  }
}

export namespace CommentAvatar {
  export const $Class = Static($CommentAvatar); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type Props = ExtractPropTypes<typeof $Class.props>;
  export interface Cell {
    x: number;
    y: number;
  }
}
