/*
=== GENERATOR ===
Goal: Prove the one clock ticks only while something holds it, that every elapsed label derives from it, and that a finished thing's label is frozen at its duration.
[One clock, held while pending](./ai-chat.invariants.md#one-clock-held-while-pending)
// domain-invariant: $Clock — If nothing holds the clock, then no interval is running
// domain-invariant: $Clock — If a thing has a duration, then its elapsed reads that duration and never the clock
Impossible if true: a counter ticks after its part is done

=== GENERATOR-DESCRIBED ===
$Clock is the one interval every loader reads, held while something is pending and stopped when nothing is.
*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Clock } from './Clock';

describe('Clock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // domain-invariant: $Clock — If nothing holds the clock, then no interval is running
  // impossible-if-true: $Clock — a counter ticks after its part is done
  // invariant: One clock, held while pending (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('runs one interval while held, stops when the last holder releases, and a release is idempotent', () => {
    const clock = new Clock.Class();
    expect(clock.isTicking).toBe(false);
    const releaseA = clock.hold();
    const releaseB = clock.hold();
    expect(clock.isTicking).toBe(true);
    expect(clock.holders.value).toBe(2);
    const startedAt = clock.now.value;
    vi.advanceTimersByTime(1_000);
    expect(clock.now.value - startedAt).toBeGreaterThanOrEqual(750);
    releaseA();
    releaseA();
    expect(clock.holders.value).toBe(1);
    expect(clock.isTicking).toBe(true);
    releaseB();
    expect(clock.isTicking).toBe(false);
    const frozen = clock.now.value;
    vi.advanceTimersByTime(5_000);
    expect(clock.now.value).toBe(frozen);
    clock.dispose();
  });

  // domain-invariant: $Clock — If a thing has a duration, then its elapsed reads that duration and never the clock
  it('elapsed is live against now until a duration freezes it', () => {
    const clock = new Clock.Class();
    const release = clock.hold();
    const startedAt = clock.now.value;
    vi.advanceTimersByTime(2_000);
    expect(clock.elapsed(startedAt, null)).toBeGreaterThanOrEqual(1_750);
    expect(clock.elapsed(startedAt, 4_800)).toBe(4_800);
    release();
    clock.dispose();
    expect(clock.isTicking).toBe(false);
  });

  it('labels: live counters read whole seconds, receipts read tenths under ten seconds', () => {
    expect(Clock.Class.label(400, true)).toBe('0s');
    expect(Clock.Class.label(400)).toBe('400ms');
    expect(Clock.Class.label(4_800)).toBe('4.8s');
    expect(Clock.Class.label(4_800, true)).toBe('4s');
    expect(Clock.Class.label(47_200)).toBe('47s');
    expect(Clock.Class.label(64_000)).toBe('1m 04s');
    expect(Clock.Class.label(3_720_000)).toBe('1h 02m');
  });
});
