import { describe, expect, it } from 'vitest';
import { AppRouter } from './AppRouter';

interface RouteRecord {
  path: string;
  name?: string;
  redirect?: unknown;
  children?: RouteRecord[];
}

describe('AppRouter', () => {
  const routes = AppRouter.Class.ROUTES as unknown as RouteRecord[];

  it('names every view route under its domain and avoids the Worker-owned /drip path', () => {
    const leaves = new Map<string, string>();
    for (const domain of routes.filter((route) => route.children)) {
      for (const child of domain.children ?? []) {
        if (child.name) leaves.set(child.name, `${domain.path}/${child.path}`);
      }
    }
    expect(leaves).toEqual(
      new Map([
        ['subscribers', '/newsletter/subscribers'],
        ['sends', '/newsletter/sent'],
        ['posts', '/newsletter/posts'],
        ['send', '/newsletter/send'],
        ['drip', '/newsletter/drip-plan'],
        ['stats', '/newsletter/stats'],
        ['newsletter-settings', '/newsletter/settings'],
        ['x', '/socials/x'],
        ['socials-settings', '/socials/settings'],
      ]),
    );
    // run_worker_first claims GET /drip — the SPA must never route there
    expect([...leaves.values()]).not.toContain('/newsletter/drip');
  });

  it('pre-domain URLs redirect into /newsletter, preserving the query', () => {
    const legacy = routes.find((route) => route.path === '/posts');
    expect(legacy).toBeDefined();
    const target = (
      legacy!.redirect as (to: { query: Record<string, string> }) => {
        path: string;
        query: Record<string, string>;
      }
    )({ query: { preview: 'first-post' } });
    expect(target).toEqual({
      path: '/newsletter/posts',
      query: { preview: 'first-post' },
    });
  });

  it('root and unknown paths land on the subscribers table', () => {
    expect(
      routes.find((route) => route.path === '/')?.redirect,
    ).toBe('/newsletter/subscribers');
    expect(
      routes.find((route) => route.path.startsWith('/:pathMatch'))?.redirect,
    ).toBe('/');
  });

  it('the $router instance is built once and cached ($-getter contract)', () => {
    expect(AppRouter.Class.$router).toBe(AppRouter.Class.$router);
  });
});
