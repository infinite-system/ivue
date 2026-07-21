/**
 * Coverage completion for the package entry and Kernel container.
 */
import { describe, expect, it } from 'vitest';
import * as packageEntry from '../index';
import * as extrasEntry from '../extras';
import { Kernel, kernel } from '../kernel';

describe('package entry (index.ts)', () => {
  it('re-exports the engine surface', () => {
    expect(typeof packageEntry.Reactive).toBe('function');
  });
});

describe('extras entry (extras.ts)', () => {
  it('re-exports the toolkit beyond the core', () => {
    expect(typeof extrasEntry.Static).toBe('function');
  });
});

describe('Kernel', () => {
  it('sets, gets, falls back, clears', () => {
    const container = new Kernel();
    container.set('answer', 42);
    expect(container.get('answer', 0)).toBe(42);
    expect(container.get('missing', 'fallback')).toBe('fallback');
    container.clear();
    expect(container.get('answer', 0)).toBe(0);
    expect(kernel).toBeInstanceOf(Kernel);
  });
});
