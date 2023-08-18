import type { UnwrapNestedRefs, Ref } from "vue";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";

export default interface IRoutable {
  $route: UnwrapNestedRefs<Ref<RouteLocationNormalizedLoaded>>,
  $router: Router
}