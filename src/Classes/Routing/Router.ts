import { Messages } from '../Core/Messages/Messages'
import { User } from '../Auth/User'
import { use } from '@/index'
import { RouterGateway } from "@/Classes/Routing/RouterGateway";
import type { RouteRecordNormalized } from 'vue-router';
import type { Null } from '@/types/core';

type AnyObj = Record<string | number | symbol, any>

const __$Router__ = ($ = $Router.prototype) => ([
  // Links
  $.gateway,
  $.user,
  $.messages,
  // Data
  $.active,
  $.routes,
  $.routeConfig,
  // Methods
  $.register,
  $.flatten,
  $.configure,
  $.find,
  $.get,
  $.go,
  $.onRouteChanged,
  $.updateRoute
])

export class $Router {

  get gateway () { return use(RouterGateway) }

  get user () { return use(User) }

  get messages () { return use(Messages) }

  active = { name: null }

  routes = []

  routeConfig: any[] = []

  /**
   * Register routes with the router.
   * 
   * @param routes 
   */
  register (routes: any) {

    this.routes = routes

    this.flatRoutes = this.flatten(this.routes)
    // console.log('this.flatRoutes', this.flatRoutes)

    this.routeConfig = this.configure(this.routes)
    // console.log('routeConfig', routeConfig)

    this.gateway.register(this.routeConfig)
  }

  flatRoutes: AnyObj = {}

  /**
   * Flatten the routes into a flat array.
   * 
   * @param routes     routes to flaten
   * @param flatRoutes recursion storage
   * @returns flat array of routes
   */
  flatten (routes: any, flatRoutes: AnyObj = {}) {
    routes.forEach((route: AnyObj) => {
      flatRoutes[route.name] = route
      if ('children' in route) {
        this.flatten(route.children, flatRoutes)
      }
    })
    return flatRoutes
  }

  configure (routes: any) {

    const routeConfig: any[] = []

    routes.forEach((routeArg: AnyObj) => {
      // console.log('routeArg', routeArg)
      const route = this.find(routeArg.name)

      const routeDefinition: any = {
        name: route.name,
        path: route.path,
        meta: { secure: route.secure },
        component: route.component
      }

      if ('children' in route) {
        routeDefinition.children = this.configure(route.children)
      }

      routeConfig.push(routeDefinition)
    })

    return routeConfig
  }

  find (name: Null<string>) {
    return name && name in this.flatRoutes ? this.flatRoutes[name] : { name: 'loadingSpinner', path: '' }
  }

  get (name: Null<string>) {
    return name && name in this.flatRoutes ? this.flatRoutes[name] : this.routes[this.routes.length - 1]
  }

  async go (name, params, query) {
    console.log('go to name', name)
    return this.gateway.go(name)
  }

  onRouteChanged () {
    this.messages.$.appMessages = []
  }

  async updateRoute (to: RouteRecordNormalized) {

    const old = this.find(this.active.name)
    const fresh = this.get(to.name as string)

    const routeChanged = old.name !== fresh.name
    const token = !!this.user.token

    const notAllowed = fresh.secure && !token || fresh.name === '*'
    const allowed = fresh.secure && token || !fresh.secure

    console.log(
      'fresh', fresh,
      'old', old,
      'routeChanged', routeChanged,
      'notAllowed', notAllowed,
      'allowed', allowed,
    )

    if (routeChanged) {

      this.onRouteChanged()

      if (notAllowed) {

        this.go('loginLink')

        return false

      } else if (allowed) {

        if (old.onLeave) old.onLeave()
        if (fresh.onEnter) fresh.onEnter()

        this.active = fresh
        this.active.params = to.params
        this.active.query = to.query

        return true
      }
    }
    return true
  }
}

__$Router__

export class Router {

  get $ () { return use($Router) }

  get active () {
    return this.$.active
  }

  async go (name, params, query) {
    return this.$.go(name)
  }
}
