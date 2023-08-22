import { markRaw } from 'vue';
import { createRouter, createWebHistory } from 'vue-router'
import { Behavior, use } from '@/index'
import { $Message } from '../Message/Message'
import { User } from '../../Auth/User'
import type { RouteLocationNormalized } from 'vue-router';
import type { Null, AnyObj } from '@/types/core';
import type { Router as VueRouter } from 'vue-router'

const __$Router__ = ($ = $Router.prototype) => ([
  // Links
  $.user,
  $.$message,
  // Data
  $.active,
  $.routes,
  $.routeConfig,
  // Methods
  $.register,
  $.flatten,
  $.configure,
  $.find,
  $.onRouteChanged,
  $.updateRoute,
])

export class $Router {

  get user () { return use(User) }

  get $message () { return use($Message) }

  router!: VueRouter

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


    this.router = createRouter({ history: createWebHistory(), routes: this.routes })
    this.router.beforeEach(async to => await this.updateRoute(to))
  }

  private flatRoutes: AnyObj = {}

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

  find (name: Null<string | symbol | undefined>) {
    return name && name in this.flatRoutes ? this.flatRoutes[name] : this.routes[this.routes.length - 1]
  }

  onRouteChanged () {
    this.$message.appMessages = []
  }

  async updateRoute (to: RouteLocationNormalized) {

    const old = this.find(this.active.name)
    const fresh = this.find(to.name)

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

        this.router.push({ name: 'loginLink' })

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

const $ = use($Router)
export class Router {

  $ = markRaw(use($Router))

  static behavior = {
    active: Behavior.DISABLED,
    currentRoute: Behavior.DISABLED,
    options: Behavior.DISABLED
  }

  get active () { return $.active }
  get currentRoute () { return $.router.currentRoute }
  get options () { return $.router.options }

  set listening (v: boolean) { $.router.listening = v }

  addRoute = $.router.addRoute.bind($.router)
  removeRoute = $.router.removeRoute.bind($.router)
  hasRoute = $.router.hasRoute.bind($.router)
  getRoutes = $.router.getRoutes.bind($.router)
  resolve = $.router.resolve.bind($.router)
  push = $.router.push.bind($.router)
  replace = $.router.replace.bind($.router)
  back = $.router.back.bind($.router)
  forward = $.router.forward.bind($.router)
  go = $.router.go.bind($.router)
  beforeEach = $.router.beforeEach.bind($.router)
  beforeResolve = $.router.beforeResolve.bind($.router)
  afterEach = $.router.afterEach.bind($.router)
  onError = $.router.onError.bind($.router)
  isReady = $.router.isReady.bind($.router)
}
