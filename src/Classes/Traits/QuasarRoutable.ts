import Router from '@/router';
import { reactive } from 'vue'
import type IRoutable from './Contracts/IRoutable'

export class QuasarRoutable implements IRoutable {
  $router = Router
  $route = reactive(Router.currentRoute)
}
