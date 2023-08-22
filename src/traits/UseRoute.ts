import Router from '../../../demo/router';
import { reactive } from 'vue'

export class UseRoute {
  $route = reactive(Router.active)
}
