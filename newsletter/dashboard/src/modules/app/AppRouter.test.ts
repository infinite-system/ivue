import { describe, expect, it } from 'vitest';
import { AppRouter } from './AppRouter';

describe('AppRouter', () => {
  it('names every view route and avoids the Worker-owned /drip path', () => {
    const routesByName = new Map(
      AppRouter.Class.ROUTES.filter((route) => 'name' in route).map(
        (route) => [route.name, route.path],
      ),
    );
    expect(routesByName).toEqual(
      new Map([
        ['subscribers', '/'],
        ['sends', '/sent'],
        ['posts', '/posts'],
        ['send', '/send'],
        ['drip', '/drip-plan'],
        ['stats', '/stats'],
      ]),
    );
    // run_worker_first claims GET /drip — the SPA must never route there
    expect([...routesByName.values()]).not.toContain('/drip');
  });

  it('unknown paths redirect to the subscribers table', () => {
    const catchAll = AppRouter.Class.ROUTES.find(
      (route) => 'redirect' in route,
    );
    expect(catchAll?.redirect).toBe('/');
  });

  it('the $router instance is built once and cached ($-getter contract)', () => {
    expect(AppRouter.Class.$router).toBe(AppRouter.Class.$router);
  });
});
