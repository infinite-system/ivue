// PostHog — product analytics beside the Cloudflare beacon (which stays
// as the zero-dependency backstop). Everything here is browser-only and
// PRODUCTION-only: local dev and previews never pollute the data. The
// project key is a public client key by design.
//
// Pageviews (including SPA route changes) are automatic under the
// defaults date below; the custom events are the newsletter funnel.
import type posthogType from 'posthog-js';

const POSTHOG_KEY = 'phc_CugrcHNUFhjxmYPRdN5ZskNBfkyjGJfX3eMKZ3AvfyYJ';
const POSTHOG_HOST = 'https://us.i.posthog.com';
const PRODUCTION_HOSTNAME = 'ivue.dev';

let client: typeof posthogType | null = null;

export async function initAnalytics() {
  if (typeof window === 'undefined') return;
  if (window.location.hostname !== PRODUCTION_HOSTNAME) return;
  const { default: posthog } = await import('posthog-js');
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
  });
  client = posthog;
}

// Safe from anywhere: no-ops on the server, in dev, and before init.
export function captureEvent(
  eventName: string,
  properties?: Record<string, string | number | boolean>,
) {
  client?.capture(eventName, properties);
}
