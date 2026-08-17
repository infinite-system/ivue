// Workers runtime provides crypto.subtle.timingSafeEqual; Node's
// webcrypto does not. Polyfill it for tests only, with the same
// constant-time comparison from node:crypto.
import { timingSafeEqual } from 'node:crypto';

const subtle = crypto.subtle as SubtleCrypto & {
  timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean;
};
if (typeof subtle.timingSafeEqual !== 'function') {
  Object.defineProperty(subtle, 'timingSafeEqual', {
    value: (a: ArrayBuffer, b: ArrayBuffer) =>
      timingSafeEqual(new Uint8Array(a), new Uint8Array(b)),
    configurable: true,
  });
}
