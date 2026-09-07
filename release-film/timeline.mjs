export const DURATION = 48;
export const OBJECTS_DURATION = 16;
export const clamp = value => Math.max(0, Math.min(1, value));
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const mix = (start, end, amount) => start + (end - start) * amount;
export const ramp = (time, start, end) => smooth((time - start) / (end - start));
export const envelope = (time, start, end, fade = 0.6) => ramp(time, start, start + fade) * (1 - ramp(time, end - fade, end));

// Each cue is sampled at an absolute time. Export never depends on real-time fps.
export const chapters = [
  { start: 0, end: 6, name: 'The question' },
  { start: 6, end: 12, name: 'The foundation' },
  { start: 12, end: 18, name: 'Shared behavior' },
  { start: 18, end: 25, name: 'Objects in motion' },
  { start: 25, end: 32, name: 'First touch' },
  { start: 32, end: 39, name: 'The reduction' },
  { start: 39, end: 48, name: 'Infinite Vue' },
];

export function jump(time, offset = 0) {
  const cycle = ((time + offset) % 2.4 + 2.4) % 2.4;
  const airborne = clamp((cycle - 0.32) / 1.62);
  const height = cycle > 0.32 && cycle < 1.94 ? Math.sin(airborne * Math.PI) * 1.45 : 0;
  const landing = Math.exp(-Math.max(0, cycle - 1.94) * 10) * (cycle >= 1.94 ? 1 : 0);
  return { height, squash: 1 - landing * 0.18, cycle, airborne };
}

export function shapeAt(time) {
  const sequence = ['brick', 'triangle', 'circle', 'brick'];
  const phase = Math.max(0, time) / 2.4;
  const index = Math.floor(phase) % 3;
  return { from: sequence[index], to: sequence[index + 1], amount: ramp(phase % 1, 0.34, 0.58) };
}
