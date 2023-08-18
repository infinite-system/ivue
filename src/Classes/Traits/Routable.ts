import Router from '../../../demo/router';
import { reactive } from 'vue'
import type IRoutable from './Contracts/IRoutable'

export class Routable implements IRoutable {
  $router = Router
  $route = reactive(Router.currentRoute)
}
