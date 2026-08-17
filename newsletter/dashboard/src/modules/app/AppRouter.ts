import { Static } from 'ivue/extras';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';
import type { Router } from 'vue-router';

// The application router — vue-router owns the URL, and every route is
// NAMED by its ViewName so the store can read/push views by name. Route
// components are lazy imports: the router module itself never touches a
// .vue file at load time, so it stays importable in node tests (and the
// views code-split for free). The Worker owns GET /drip
// (run_worker_first), so the drip view routes as /drip-plan.
class $AppRouter {
  static get ROUTES() {
    return [
      {
        path: '/',
        name: 'subscribers',
        component: () => import('../subscribers/SubscribersView.vue'),
      },
      {
        path: '/sent',
        name: 'sends',
        component: () => import('../sends/SendsView.vue'),
      },
      {
        path: '/posts',
        name: 'posts',
        component: () => import('../posts/PostsView.vue'),
      },
      {
        path: '/send',
        name: 'send',
        component: () => import('../send/SendView.vue'),
      },
      {
        path: '/drip-plan',
        name: 'drip',
        component: () => import('../drip/DripView.vue'),
      },
      {
        path: '/stats',
        name: 'stats',
        component: () => import('../stats/StatsView.vue'),
      },
      // unknown paths land on the subscribers table
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
