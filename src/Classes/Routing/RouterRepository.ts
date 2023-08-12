import { injectable } from 'inversify'
import { use } from '@/Kernel'
import { RouterGateway } from "@/Classes/Routing/RouterGateway";

@injectable()
export class RouterRepository {

  get routerGateway () { return use(RouterGateway) }

  currentRoute = { routeId: null }

  onRouteChanged = null

  routes = [
    {
      routeId: 'root',
      routeDef: {
        path: '/',
        isSecure: true,
        component: () => import('@/Classes/Home/HomeComponent.vue'),
      }
    },
    {
      routeId: 'loginLink',
      routeDef: {
        path: '/app/login',
        isSecure: false,
        component: () => import('@/Classes/Authentication/LoginRegisterComponent.vue'),
      }
    },
    {
      routeId: 'homeLink',
      routeDef: {
        path: '/app/home',
        isSecure: true,
        component: () => import('@/Classes/Home/HomeComponent.vue'),
      }
    },
    {
      routeId: 'authorPolicyLink',
      routeDef: {
        path: '/app/author-policy',
        isSecure: false,
        component: () => import('@/Classes/Home/HomeComponent.vue'),
      }
    },
    {
      routeId: '*',
      routeDef: {
        path: '/:catchAll(.*)*',
        isSecure: true,
        component: () => import('@/Classes/Routing/NotFoundRoute.vue')
      }
    },
  ]

  flatRoutes = {}

  constructor () {
  }

  flattenRoutes (routes, flatRoutes = {}) {
    routes.forEach(route => {
      flatRoutes[route.routeId] = route
      if ('children' in route.routeDef) {
        this.flattenRoutes(route.routeDef.children, flatRoutes)
      }
    })
    return flatRoutes
  }

  configureRoutes = (routes) => {

    const routeConfig = []

    routes.forEach(routeArg => {
      // console.log('routeArg', routeArg)
      const route = this.findRoute(routeArg.routeId)

      const routeId = routeArg.routeId;

      const routeDefinition = {
        name: route.routeId,
        path: route.routeDef.path,
        component: route.routeDef.component
      }

      if ('children' in route.routeDef) {
        routeDefinition.children = this.configureRoutes(route.routeDef.children)
      }

      routeConfig.push(routeDefinition)
    })

    return routeConfig
  }

  registerRoutes (updateCurrentRoute, onRouteChanged) {

    this.onRouteChanged = onRouteChanged

    this.flatRoutes = this.flattenRoutes(this.routes)
    // console.log('this.flatRoutes', this.flatRoutes)

    const routeConfig = this.configureRoutes(this.routes)
    // console.log('routeConfig', routeConfig)

    this.routerGateway.registerRoutes(routeConfig, updateCurrentRoute)
  }

  findRoute (routeId) {
    return routeId in this.flatRoutes
      ? this.flatRoutes[routeId]
      : { routeId: 'loadingSpinner', routeDef: { path: '' } }
  }

  getNewRoute (newRouteId) {
    return newRouteId in this.flatRoutes
      ? this.flatRoutes[newRouteId]
      : this.routes[this.routes.length - 1]
  }

  async goToId (routeId, params, query) {
    console.log('go to routeId', routeId)
    return this.routerGateway.goToId(routeId)
  }
}
