// BirdFlockPainter.ts — a flock on the GPU, on its own clock, in whichever
// thread holds the canvas. The birds' wings beat by TIME, not by the scroll:
// a wingbeat is not scroll-linked motion, so it belongs to the canvas's own
// frame loop, drawn by WebGL — in a worker when the canvas can be handed one
// (an OffscreenCanvas: a main-thread stall never reaches the birds, and the
// birds never cost the main thread), on the main thread otherwise. The
// painter knows nothing of threads: it takes a canvas and a size, and a
// `BirdFlock` controller decides where it runs. Where the flock IS on the
// stage is scroll-linked, and that is not this class's business: the stage
// moves the canvas as one composed track (lenis/presented-motion.generator.md).
import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';

class $BirdFlockPainter {
  /** Birds in the flock. */
  static readonly COUNT: number = 15;

  /** Wingbeats per second — a mid-sized bird's cruise. */
  static readonly FLAP_HZ: number = 2.4;

  /** The wing's span in clip-space units of the canvas's height. */
  static readonly SPAN: number = 0.11;

  /** How far a startled bird bursts, in clip units, and how fast it regroups. */
  static readonly STARTLE = { burst: 0.42, riseMs: 140, settleMs: 900, flapBoost: 1.6 };

  /** A startle's grip on the flock at a time since it: 0 before, a burst
   *  that peaks within the rise and decays over the settle. Pure. */
  static startleAt(sinceMs: number): number {
    if (sinceMs < 0) return 0;
    const { riseMs, settleMs } = this.STARTLE;
    return (1 - Math.exp(-sinceMs / riseMs)) * Math.exp(-sinceMs / settleMs);
  }

  static readonly VERTEX_SHADER = `
      attribute vec2 position;
      attribute float shade;
      varying float vShade;
      void main() {
        vShade = shade;
        gl_Position = vec4(position, 0.0, 1.0);
      }`;

  static readonly FRAGMENT_SHADER = `
      precision mediump float;
      uniform vec4 color;
      varying float vShade;
      void main() {
        gl_FragColor = vec4(color.rgb * vShade, color.a);
      }`;

  /** The formation: a loose V, each bird with its place, its own wingbeat
   *  phase, its size and its shade (the far birds smaller and paler). Seeded,
   *  so the same flock flies every time. */
  static formation(count = this.COUNT): BirdFlockPainter.Bird[] {
    let seed = 7;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const birds: BirdFlockPainter.Bird[] = [];
    for (let index = 0; index < count; index++) {
      const rank = Math.ceil(index / 2);
      const side = index === 0 ? 0 : index % 2 === 1 ? -1 : 1;
      const depth = rank / Math.max(1, Math.ceil((count - 1) / 2));
      birds.push({
        x: 0.55 - depth * 0.95 + (next() - 0.5) * 0.08,
        y: 0.25 + side * depth * 0.55 + (next() - 0.5) * 0.1,
        phase: next() * Math.PI * 2,
        size: 1 - depth * 0.35 + (next() - 0.5) * 0.12,
        shade: 1 - depth * 0.45
      });
    }
    return birds;
  }

  /** The flock's vertices at a time: two wings per bird, a triangle each,
   *  three floats per vertex (x, y, shade). The wingtips beat by time. Pure,
   *  so a test can hold the wingbeat without a GPU. */
  static vertices(
    birds: BirdFlockPainter.Bird[],
    timeMs: number,
    aspect: number,
    out = new Float32Array(birds.length * 6 * 3),
    startle: BirdFlockPainter.Startle | null = null
  ): Float32Array {
    // hoisted out of the per-bird loop: the static tables are built per read
    const { burst, flapBoost } = this.STARTLE;
    const spanUnit = this.SPAN;
    const grip = startle ? this.startleAt(timeMs - startle.atMs) : 0;
    const flapPhase = timeMs * 0.001 * this.FLAP_HZ * (1 + grip * flapBoost) * Math.PI * 2;
    let at = 0;
    for (const bird of birds) {
      const span = spanUnit * bird.size;
      const flap = Math.sin(flapPhase + bird.phase);
      const bob = Math.sin(flapPhase * 0.5 + bird.phase) * span * 0.08;
      // a startled bird bursts away from the point, the near ones hardest
      let x = bird.x;
      let y = bird.y + bob;
      if (startle && grip > 0) {
        const dx = bird.x - startle.x;
        const dy = bird.y - startle.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        const push = (grip * burst) / (0.35 + distance);
        x += (dx / distance) * push;
        y += (dy / distance) * push;
      }
      const tipY = y + flap * span * 0.75;
      const trailY = y - span * 0.14;
      for (const side of [-1, 1]) {
        // body root, wingtip, trailing edge
        out[at++] = x;
        out[at++] = y * aspect;
        out[at++] = bird.shade;
        out[at++] = x + side * span;
        out[at++] = tipY * aspect;
        out[at++] = bird.shade;
        out[at++] = x + side * span * 0.18;
        out[at++] = trailY * aspect;
        out[at++] = bird.shade;
      }
    }
    return out;
  }

  /** A canvas of either kind: the DOM's, or the offscreen one a worker holds. */
  constructor(public canvas: HTMLCanvasElement | OffscreenCanvas) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BirdFlockPainter;
  }

  protected readonly birds = this.self.formation();
  protected readonly data = new Float32Array(this.self.COUNT * 6 * 3);

  // STATE
  /** Whether the flock's own loop is running. */
  get running() {
    return ref(false);
  }

  /** The context, once the canvas has given one. */
  protected get gl() {
    return shallowRef<WebGLRenderingContext | null>(null);
  }

  protected get buffer() {
    return shallowRef<WebGLBuffer | null>(null);
  }

  protected get colorLocation() {
    return shallowRef<WebGLUniformLocation | null>(null);
  }

  /** The pending frame of the flock's own loop. */
  protected get frame() {
    return ref<number | null>(null);
  }

  /** The last startle: where the hand came down, and when. */
  protected get startle() {
    return shallowRef<BirdFlockPainter.Startle | null>(null);
  }

  // DERIVED
  /** The canvas's aspect, so a square formation is drawn square. */
  get aspect(): number {
    return this.canvas.height ? this.canvas.width / this.canvas.height : 1;
  }

  // METHODS
  /** Take the context, compile the two shaders, bind the one buffer. False
   *  when the platform has no WebGL — the stage then flies no birds. */
  setup(): boolean {
    const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) return false;
    const program = gl.createProgram();
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
    };
    compile(gl.VERTEX_SHADER, this.self.VERTEX_SHADER);
    compile(gl.FRAGMENT_SHADER, this.self.FRAGMENT_SHADER);
    gl.linkProgram(program);
    gl.useProgram(program);
    this.buffer.value = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.value);
    const stride = 3 * 4;
    const position = gl.getAttribLocation(program, 'position');
    const shade = gl.getAttribLocation(program, 'shade');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(shade);
    gl.vertexAttribPointer(shade, 1, gl.FLOAT, false, stride, 2 * 4);
    this.colorLocation.value = gl.getUniformLocation(program, 'color');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.gl.value = gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    return true;
  }

  /** Size the drawing buffer, in device pixels: the controller measures the
   *  layout and the ratio, because a worker can read neither. */
  resize(width: number, height: number) {
    const pixelWidth = Math.max(1, Math.round(width));
    const pixelHeight = Math.max(1, Math.round(height));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.gl.value?.viewport(0, 0, pixelWidth, pixelHeight);
  }

  /** Run the flock's own loop, in this thread. False when there is no WebGL. */
  start(): boolean {
    if (this.running.value) return true;
    if (!this.gl.value && !this.setup()) return false;
    this.running.value = true;
    this.frame.value = requestAnimationFrame(this.onFrame);
    return true;
  }

  stop() {
    this.running.value = false;
    if (this.frame.value !== null) cancelAnimationFrame(this.frame.value);
    this.frame.value = null;
  }

  onFrame(now: number) {
    if (!this.running.value) return;
    this.draw(now);
    this.frame.value = requestAnimationFrame(this.onFrame);
  }

  /** A startle at a point in the canvas's own unit square (0..1 across and
   *  down, as the controller maps a page point): the flock bursts away from
   *  it, in the formation's coordinates. */
  startleAt(unitX: number, unitY: number, timeMs = performance.now()) {
    const x = unitX * 2 - 1;
    const y = (1 - unitY * 2) / this.aspect;
    this.startle.value = { x, y, atMs: timeMs };
  }

  /** One frame drawn at once — for a test, or a frame outside the loop. */
  drawNow(timeMs: number) {
    this.draw(timeMs);
  }

  /** One frame of the flock at a time, on the flock's own clock. */
  draw(timeMs: number) {
    const gl = this.gl.value;
    if (!gl) return;
    const vertices = this.self.vertices(this.birds, timeMs, this.aspect, this.data, this.startle.value);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4f(this.colorLocation.value, 0.06, 0.07, 0.1, 0.9);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
  }
}

export namespace BirdFlockPainter {
  export const $Class = Static($BirdFlockPainter); // anchor — it declares statics
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;

  /** A startle: where, in the formation's square, and when. */
  export interface Startle {
    x: number;
    y: number;
    atMs: number;
  }

  /** A bird's place in the formation, in a unit square, and its beat. */
  export interface Bird {
    x: number;
    y: number;
    phase: number;
    size: number;
    shade: number;
  }
}
