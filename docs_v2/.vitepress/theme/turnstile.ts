// ONE Turnstile script for the whole app. Several components render
// widgets (the newsletter card's placements, the quick-join forms, the
// comment form) — but api.js must load exactly ONCE: each additional
// load re-initializes window.turnstile and orphans every widget the
// previous instance rendered (containers stay marked as occupied, no
// iframe ever appears, no callback ever fires). A module-level promise
// is the app-wide dedupe.
let scriptPromise: Promise<void> | undefined;

export function loadTurnstileScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve) => {
    if ((window as any).turnstile) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    document.head.appendChild(script);
  });
  return scriptPromise;
}
