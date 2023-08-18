import { createRouter, createWebHistory } from 'vue-router'
import { type Router } from 'vue-router'

export class RouterGateway {

  router: Router

  async registerRoutes (routeConfig, updateCurrentRoute) {

    if (this.router) {
      return new Promise((resolve) => setTimeout(resolve, 0))
    }

    this.router = createRouter({
      history: createWebHistory(),
      routes: routeConfig
    })

    this.router.beforeEach(async to => {
      return await updateCurrentRoute(to.name)
    })

    console.log('vueRouter', this.router)

    return new Promise((resolve) => setTimeout(resolve, 0))
  }

  unload () {
    this.router = null
  }

  async goToId (name, queryString = {}) {
    return await this.router.push({ name: name, query: queryString })
  }
}
