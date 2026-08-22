// Deploy-race protection — the PROACTIVE kind.
//
// The failure this kills: a tab keeps running an old build, a deploy
// replaces every hashed chunk, and the tab's next client-side
// navigation dynamic-imports a chunk that no longer exists. VitePress's
// router CATCHES that import failure internally (it never surfaces as
// vite:preloadError or an unhandled rejection — which is why rescue
// handlers on those channels never fired), refetches hashmap.json, and
// retries; the retry either renders the not-found fallback or pulls NEW
// chunks into the OLD app and crashes the render. Either way: broken
// page.
//
// So don't rescue — prevent. Every built page inlines its own
// __VP_HASH_MAP__, and the server serves the current one at
// /hashmap.json with max-age=0 (always revalidated). Navigation breaks
// EXACTLY when those two disagree, so that comparison is the whole
// test:
//
// - before every SPA navigation (onBeforeRouteChange, awaited and
//   cancelable): if the maps disagree, cancel the SPA hop and do a full
//   location.assign — the browser fetches fresh HTML from the new
//   build. The check is throttled (a fresh verdict holds for 30s) and
//   fails OPEN on network trouble (offline reading keeps working).
// - on tab refocus and bfcache restore: check in the background and
//   remember the verdict, so the next click hard-navigates instantly.
//
// The comparison uses the map SNAPSHOTTED AT BOOT: VitePress's own
// failure retry overwrites window.__VP_HASH_MAP__ with the server's
// map, but the loaded chunks stay old — the boot snapshot is what this
// tab actually runs.
import type { Router } from 'vitepress';

declare global {
  interface Window {
    __VP_HASH_MAP__?: Record<string, string>;
  }
}

const FRESH_VERDICT_TTL_MS = 30_000;
const NAVIGATION_CHECK_TIMEOUT_MS = 2_500;
const BACKGROUND_CHECK_TIMEOUT_MS = 5_000;

let bootHashmap = '';
let knownStale = false;
let lastFreshVerdictAt = 0;
// field-debuggable state: window.__ivueDeployGuard.state() in any tab
const lastCheck = { at: 0, outcome: 'never-ran' };

async function serverHashmapDiffers(timeoutMs: number): Promise<boolean> {
  if (!bootHashmap) {
    lastCheck.outcome = 'no-boot-hashmap';
    return false;
  }
  lastCheck.at = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      import.meta.env.BASE_URL + 'hashmap.json',
      { cache: 'no-store', signal: controller.signal },
    );
    if (!response.ok) {
      lastCheck.outcome = `http-${response.status}`;
      return false;
    }
    const differs = JSON.stringify(await response.json()) !== bootHashmap;
    lastCheck.outcome = differs ? 'stale' : 'fresh';
    return differs;
  } catch (error) {
    lastCheck.outcome = `failed-open: ${String(error).slice(0, 80)}`;
    return false; // fail open — never block navigation on a flaky network
  } finally {
    clearTimeout(timer);
  }
}

async function refreshVerdict(timeoutMs: number): Promise<void> {
  if (knownStale) return; // stale is permanent until a full load
  if (await serverHashmapDiffers(timeoutMs)) {
    knownStale = true;
    console.info(
      '[deploy-guard] new deploy detected — next navigation loads it fully',
    );
  } else if (lastCheck.outcome === 'fresh') {
    lastFreshVerdictAt = Date.now();
  }
}

export function installDeployGuard(router: Router): void {
  if (typeof window === 'undefined') return;
  bootHashmap = window.__VP_HASH_MAP__
    ? JSON.stringify(window.__VP_HASH_MAP__)
    : '';

  // field diagnostics — cheap, and exactly what you need when a tab
  // misbehaves: __ivueDeployGuard.state() / .check() in the console
  (window as unknown as Record<string, unknown>).__ivueDeployGuard = {
    state: () => ({
      knownStale,
      lastFreshVerdictAt,
      lastCheckAt: lastCheck.at,
      lastCheckOutcome: lastCheck.outcome,
      bootHashmapBytes: bootHashmap.length,
    }),
    check: () => serverHashmapDiffers(BACKGROUND_CHECK_TIMEOUT_MS),
  };

  const onBeforeRouteChange = router.onBeforeRouteChange;
  router.onBeforeRouteChange = async (to) => {
    if ((await onBeforeRouteChange?.(to)) === false) return false;
    if (!knownStale && Date.now() - lastFreshVerdictAt > FRESH_VERDICT_TTL_MS)
      await refreshVerdict(NAVIGATION_CHECK_TIMEOUT_MS);
    if (knownStale) {
      // full navigation onto the new build — the SPA hop would 404
      window.location.assign(to);
      return false;
    }
    return true;
  };

  // Tab refocus — the "left open overnight" case: settle the verdict in
  // the background so the next click doesn't even pay the check.
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible')
      refreshVerdict(BACKGROUND_CHECK_TIMEOUT_MS);
  });

  // bfcache restore resurrects the old build's live JS wholesale.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) refreshVerdict(BACKGROUND_CHECK_TIMEOUT_MS);
  });
}

// Backstop for the window the pre-navigation check can miss (deploy
// propagating mid-flight): a page that lands on the not-found fallback
// while the server's hashmap disagrees with this tab's is a stale-build
// casualty, not a real 404 — reload onto the new build. A real 404
// reloads at most once: the fresh HTML carries the fresh map, and the
// maps agree from then on.
export async function reloadIfNotFoundIsStale(): Promise<void> {
  if (knownStale || (await serverHashmapDiffers(BACKGROUND_CHECK_TIMEOUT_MS)))
    window.location.reload();
}
