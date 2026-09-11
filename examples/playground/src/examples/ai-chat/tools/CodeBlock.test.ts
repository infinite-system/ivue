/*
=== GENERATOR ===
Goal: Prove a code block's copy button puts the whole code as given on the clipboard — never the capped view — on any origin, and says so for a moment.
// domain-invariant: $CodeBlock — If the copy button is pressed, then the whole code as given reaches the clipboard, not the capped view, and the button says so for a moment
Impossible if true: a copy of the capped view

=== GENERATOR-DESCRIBED ===
$CodeBlock writes through the async clipboard where it exists and the legacy command where it does not.
*/
import { expect, it, vi } from 'vitest';
import { CodeBlock } from './CodeBlock';
import { hosted } from '../../virtual-scroller/hosted';
// domain-invariant: $CodeBlock — If the copy button is pressed, then the whole code as given reaches the clipboard, not the capped view, and the button says so for a moment
// impossible-if-true: $CodeBlock — a copy of the capped view
it('a code block copies its whole code and says so for a moment', async () => {
  vi.useFakeTimers();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: { writeText },
    configurable: true
  });
  const block = hosted(() => new CodeBlock.Class({ code: 'one\ntwo\nthree', cap: 1 }));
  expect(block.instance.isCapped).toBe(true);
  await block.instance.copy();
  expect(writeText).toHaveBeenCalledWith('one\ntwo\nthree');
  expect(block.instance.copied.value).toBe(true);
  expect(block.instance.copyLabel).toBe('Copied');
  vi.advanceTimersByTime(CodeBlock.$Class.COPIED_MS);
  expect(block.instance.copied.value).toBe(false);
  expect(block.instance.copyLabel).toBe('Copy');
  // no async clipboard — a plain-http page on a LAN address — the legacy command copies instead
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: undefined,
    configurable: true
  });
  const legacy = vi.fn().mockReturnValue(true);
  Object.defineProperty(document, 'execCommand', { value: legacy, configurable: true });
  await block.instance.copy();
  expect(legacy).toHaveBeenCalledWith('copy');
  expect(block.instance.copyLabel).toBe('Copied');
  block.unmount();
  vi.useRealTimers();
});
