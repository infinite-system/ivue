import Router from 'src/router';
import { RouteLocationNormalizedLoaded } from 'vue-router';

export interface Routable {
  $route: NonNullable<unknown>,
  $router: NonNullable<unknown>
}

export class UseRouting implements Routable {
  $route = Router.currentRoute as RouteLocationNormalizedLoaded
  $router = Router
}
