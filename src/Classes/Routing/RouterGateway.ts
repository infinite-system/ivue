import { createRouter, createWebHistory } from 'vue-router'
import type { Router as VueRouter } from 'vue-router'
import { use } from '@/index';
import { Router } from './Router';

export class RouterGateway {

  get $router () { return use(Router).$ }

  router!: VueRouter | null

  async register (routeConfig) {

    if (this.router) {
      return new Promise((resolve) => setTimeout(resolve, 0))
    }

    this.router = createRouter({ history: createWebHistory(), routes: routeConfig })
    this.router.beforeEach(async to => await this.$router.updateRoute(to.name))

    return new Promise((resolve) => setTimeout(resolve, 0))
  }

  unload () {
    this.router = null
  }

  async go (name: string, queryString = {}) {
    return await this.router.push({ name: name, query: queryString })
  }
}
