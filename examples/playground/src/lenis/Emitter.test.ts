/*
=== GENERATOR ===
Goal: A minimal event bus the fork's parts talk through: subscribe, emit in order, unsubscribe, destroy.
[A finger's swipe becomes the glide it meant, on every phone](lenis.invariants.md#a-fingers-swipe-becomes-the-glide-it-meant-on-every-phone)
// domain-invariant: $Emitter — If callbacks are subscribed to an event, then an emit calls each in subscription order with the emit's arguments, an unsubscribe removes only its own callback, and destroy removes them all.
Impossible if true: A callback called after it unsubscribed. A callback of one event called by another event's emit.

=== GENERATOR-DESCRIBED ===
Upstream Lenis's emitter, ported; the spec pins the contract the fork's
scroll and virtual-scroll events ride on.
*/

import { expect, test, vi } from 'vitest';
import { Emitter } from './Emitter';

// domain-invariant: $Emitter — If callbacks are subscribed to an event, then an emit calls each in subscription order with the emit's arguments, an unsubscribe removes only its own callback, and destroy removes them all.
// invariant: A finger's swipe becomes the glide it meant, on every phone (examples/playground/src/lenis/lenis.invariants.md)
test('emit calls the subscribers in order with the arguments; off and the returned unsubscribe remove one; destroy removes all', () => {
  const emitter = new Emitter.Class();
  const calls: string[] = [];
  const first = vi.fn((value: number) => calls.push(`first:${value}`));
  const second = vi.fn((value: number) => calls.push(`second:${value}`));
  const unsubscribeFirst = emitter.on('scroll', first);
  emitter.on('scroll', second);
  emitter.emit('scroll', 7);
  expect(calls).toEqual(['first:7', 'second:7']);
  unsubscribeFirst();
  emitter.emit('scroll', 8);
  expect(calls).toEqual(['first:7', 'second:7', 'second:8']);
  emitter.off('scroll', second);
  emitter.emit('scroll', 9);
  expect(calls).toHaveLength(3);
  emitter.on('scroll', first);
  emitter.destroy();
  emitter.emit('scroll', 10);
  expect(first).toHaveBeenCalledTimes(1);
});

// impossible-if-true: $Emitter — A callback called after it unsubscribed. A callback of one event called by another event's emit.
test('an emit never reaches another event\'s subscribers, and an emit with no subscribers is a no-op', () => {
  const emitter = new Emitter.Class();
  const onScroll = vi.fn();
  emitter.on('scroll', onScroll);
  emitter.emit('virtual-scroll', 1);
  emitter.emit('nothing');
  expect(onScroll).not.toHaveBeenCalled();
});
