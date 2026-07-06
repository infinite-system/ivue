// Svelte 5 runes inside a plain class — a real, documented Svelte 5
// feature (universal reactivity, not tied to a component). Same cell
// shape as every other arm: one raw value, four derived, one memoized.
export class SvelteCell {
  raw = $state('');
  value = $derived(this.raw + '!');
  display = $derived(this.value.toUpperCase());
  isEmpty = $derived(this.raw.length === 0);
  cssClass = $derived(this.isEmpty ? 'empty' : 'filled');
}
