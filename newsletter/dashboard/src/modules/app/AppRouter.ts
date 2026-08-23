import { Static } from 'ivue/extras';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';
import type { RouteLocation, Router } from 'vue-router';

// The application router — vue-router owns the URL. Two DOMAINS, each a
// nested layout with its own section tabs: /newsletter/* (the audience
// machine) and /socials/* (publishing). Every leaf route is NAMED by its
// ViewName so the store reads/pushes views by name. Route components are
// lazy imports: the router module never touches a .vue file at load
// time, so it stays importable in node tests (and the views code-split
// for free). The Worker owns GET /drip (run_worker_first), so the drip
// view routes as drip-plan.
class $AppRouter {
  static get ROUTES() {
    return [
      {
        path: '/newsletter',
        component: () => import('./DomainLayout.vue'),
        props: { domain: 'newsletter' },
        children: [
          { path: '', redirect: { name: 'subscribers' } },
          {
            path: 'subscribers',
            name: 'subscribers',
            component: () => import('../subscribers/SubscribersView.vue'),
          },
          {
            path: 'lists',
            name: 'lists',
            component: () => import('../lists/ListsView.vue'),
          },
          {
            path: 'sent',
            name: 'sends',
            component: () => import('../sends/SendsView.vue'),
          },
          {
            path: 'posts',
            name: 'posts',
            component: () => import('../posts/PostsView.vue'),
          },
          {
            path: 'comments',
            name: 'comments',
            component: () => import('../comments/CommentsView.vue'),
          },
          {
            path: 'send',
            name: 'send',
            component: () => import('../send/SendView.vue'),
          },
          {
            path: 'drip-plan',
            name: 'drip',
            component: () => import('../drip/DripView.vue'),
          },
          {
            path: 'stats',
            name: 'stats',
            component: () => import('../stats/StatsView.vue'),
          },
          {
            path: 'settings',
            name: 'newsletter-settings',
            component: () =>
              import('../newsletter-settings/NewsletterSettingsView.vue'),
          },
        ],
      },
      {
        path: '/socials',
        component: () => import('./DomainLayout.vue'),
        props: { domain: 'socials' },
        children: [
          { path: '', redirect: { name: 'x' } },
          {
            path: 'x',
            name: 'x',
            component: () => import('../x/XComposeView.vue'),
          },
          {
            path: 'settings',
            name: 'socials-settings',
            component: () =>
              import('../socials-settings/SocialsSettingsView.vue'),
          },
        ],
      },
      { path: '/', redirect: '/newsletter/subscribers' },
      // pre-domain URLs stay alive (bookmarks, old links); query survives
      // so /posts?preview=<slug> still deep-links the email preview
      ...['sent', 'posts', 'send', 'drip-plan', 'stats'].map((leaf) => ({
        path: `/${leaf}`,
        redirect: (to: RouteLocation) => ({
          path: `/newsletter/${leaf}`,
          query: to.query,
        }),
      })),
      { path: '/:pathMatch(.*)*', redirect: '/' },
    ];
  }

  // built once per receiving class ($-cache), installed in main.ts;
  // memory history where no DOM exists (node tests, SSR)
  static get $router(): Router {
    return createRouter({
      history:
        typeof window === 'undefined'
          ? createMemoryHistory()
          : createWebHistory(),
      routes: this.ROUTES,
    });
  }
}

export namespace AppRouter {
  export const $Class = Static($AppRouter);
  export let Class = $Class;
}
