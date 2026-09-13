import { ref, computed } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';

// The one clock every waiting thing reads. A loader's elapsed label is a
// plain getter over `now` minus its start, so a thousand pending rows
// cost one interval — and that interval runs only while something is
// pending: `hold()` starts it, the matching `release()` stops it when the
// last holder lets go. Nothing here ticks after its part is done.
class $Clock {
  static readonly TICK_MS = 250;
  /** the coarse interval a mounted thread holds: the minute a relative time turns on */
  static readonly MINUTE_MS = 60_000;

  /** "1s", "47s", "1m 04s" — the counter's face; sub-second reads as 0s while live */
  static label(ms: number, live = false): string {
    if (live && ms < 1000) return '0s';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${live ? seconds : (ms / 1000).toFixed(seconds < 10 ? 1 : 0)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Clock;
  }

  /** epoch milliseconds, advanced by the interval while anything holds the clock */
  get now() {
    return ref(Date.now());
  }

  get holders() {
    return ref(0);
  }

  get timer() {
    return ref<ReturnType<typeof setInterval> | null>(null);
  }

  get isTicking(): boolean {
    return this.timer.value !== null;
  }

  /** the coarse hold: the thread on screen wants its relative times to turn once a minute,
   *  without the fine interval a pending thing runs */
  get minuteHolders() {
    return ref(0);
  }

  get minuteTimer() {
    return ref<ReturnType<typeof setInterval> | null>(null);
  }

  // computed: render-suppression — `now` moves every tick; a relative label re-renders
  // only when the minute turns
  get minuteNow() {
    return computed(() => this.minuteOf(this.now.value));
  }

  /** something on screen asks for the minute to turn; returns the release */
  holdMinute(): () => void {
    this.minuteHolders.value++;
    if (this.minuteTimer.value === null) {
      this.now.value = Date.now();
      this.minuteTimer.value = setInterval(() => this.tick(), this.self.MINUTE_MS);
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.releaseMinute();
    };
  }

  releaseMinute() {
    this.minuteHolders.value = Math.max(0, this.minuteHolders.value - 1);
    if (this.minuteHolders.value === 0 && this.minuteTimer.value !== null) {
      clearInterval(this.minuteTimer.value);
      this.minuteTimer.value = null;
    }
  }

  /** a pending thing asks the clock to run; returns the release */
  hold(): () => void {
    this.holders.value++;
    if (this.timer.value === null) {
      this.now.value = Date.now();
      this.timer.value = setInterval(() => this.tick(), this.self.TICK_MS);
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.release();
    };
  }

  release() {
    this.holders.value = Math.max(0, this.holders.value - 1);
    if (this.holders.value === 0 && this.timer.value !== null) {
      clearInterval(this.timer.value);
      this.timer.value = null;
      this.now.value = Date.now();
    }
  }

  tick() {
    this.now.value = Date.now();
  }

  /** a time floored to its minute */
  minuteOf(time: number): number {
    return Math.floor(time / 60_000) * 60_000;
  }

  /** elapsed since a start, or the frozen duration once the thing is done */
  elapsed(startedAt: number, durationMs: number | null): number {
    if (durationMs !== null) return durationMs;
    return Math.max(0, this.now.value - startedAt);
  }

  dispose() {
    if (this.timer.value !== null) clearInterval(this.timer.value);
    this.timer.value = null;
    this.holders.value = 0;
    if (this.minuteTimer.value !== null) clearInterval(this.minuteTimer.value);
    this.minuteTimer.value = null;
    this.minuteHolders.value = 0;
  }
}

export namespace Clock {
  export const $Class = Static($Clock);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Model = InstanceType<typeof Class>;
}
