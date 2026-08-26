// Workers runtime provides crypto.subtle.timingSafeEqual; Node's
// webcrypto does not. Polyfill it for tests only, with the same
// constant-time comparison from node:crypto.
import { timingSafeEqual } from 'node:crypto';

const subtle = crypto.subtle as SubtleCrypto & {
  timingSafeEqual?: (left: ArrayBuffer, right: ArrayBuffer) => boolean;
};
if (typeof subtle.timingSafeEqual !== 'function') {
  Object.defineProperty(subtle, 'timingSafeEqual', {
    value: (left: ArrayBuffer, right: ArrayBuffer) =>
      timingSafeEqual(new Uint8Array(left), new Uint8Array(right)),
    configurable: true,
  });
}
