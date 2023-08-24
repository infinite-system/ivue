import { unref } from 'vue';
import { createRouter, createWebHistory } from 'vue-router'
import { Traits, UseCapsule, use } from '@/index'
import { $Message } from '../Message/Message'
import { User } from '../../Auth/User'
import type { RouteLocationNormalized } from 'vue-router';
import type { Null, AnyObj, Params } from '@/types/core';
import type { Router as VueRouter } from 'vue-router'

const __$Router__ = ($ = $Router.prototype) => ([
  // Access
  $.user,
  $.$message,
  // Data
  $.router,
  $.active,
  $.routes,
  $.routeConfig,
  // Methods
  $.register,
  $.flatten,
  $.setup,
  $.find,
  // Router state change tracking
  $.onRouteChanged,
  $.beforeRoute,
  $.afterRoute,
  // Extensions upon Router
  $.push,
  $.replace,
  $.forward,
  $.back,
  // Loaded state promise
  $.isLoaded
])

export class $Router {

  get user () { return use(User) }

  get $message () { return use($Message) }

  loading = false

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

    this.routeConfig = this.setup(this.routes)
    // console.log('routeConfig', routeConfig)

    this.router = createRouter({ history: createWebHistory(), routes: this.routes })

    this.router.beforeEach(async to => await this.beforeRoute(to))

    this.router.afterEach(async (to, from, failure) => await this.afterRoute(/*to, from, failure*/))
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

  setup (routes: any) {

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
        routeDefinition.children = this.setup(route.children)
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

  async beforeRoute (to: RouteLocationNormalized) {

    this.loading = true

    const old = this.find(this.active.name)
    const fresh = this.find(to.name)

    const routeChanged = old.name !== fresh.name
    const token = !!this.user.token

    const notAllowed = fresh.secure && !token || fresh.name === '*'
    const allowed = fresh.secure && token || !fresh.secure

    // console.log('fresh', fresh, 'old', old, 'routeChanged', routeChanged, 'notAllowed', notAllowed, 'allowed', allowed)

    if (routeChanged) {

      this.onRouteChanged()

      if (notAllowed) {

        await this.push({ name: 'login' })

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

  async afterRoute () {
    this.loading = false
  }

  push (...args: Params<VueRouter['push']>) {
    this.loading = true;
    return run(this.router, this.router.push, arguments)
  }

  replace (...args: Params<VueRouter['replace']>) {
    this.loading = true;
    return run(this.router, this.router.replace, arguments)
  }

  back (...args: Params<VueRouter['back']>) {
    this.loading = true;
    return run(this.router, this.router.back, arguments)
  }

  forward (...args: Params<VueRouter['forward']>) {
    this.loading = true;
    return run(this.router, this.router.forward, arguments)
  }

  go (...args: Params<VueRouter['go']>) {
    this.loading = true;
    return run(this.router, this.router.go, arguments)
  }

  async isLoaded () {
    return new Promise((resolve, reject) => {
      let interval: string | number | NodeJS.Timeout | undefined;
      if (this.loading) {
        interval = setInterval(() => {
          if (!this.loading) {
            clearInterval(interval)
            resolve(!this.loading)
          }
        }, 10)
      } else {
        resolve(!this.loading)
      }
    })
  }
}

__$Router__

function run<T extends Function> (bind: any, fn: T, args: any = []): T {
  return fn.apply(bind, args)
}

export class Router {

  capsule = $Router
  constructor () {
    this.useCapsule(arguments)
  }

  // Extended functions
  get active () { return this.$.active }
  async isLoaded () { return run(this.$, this.$.isLoaded) }

  // Vue Router API
  get currentRoute () { return unref(this.$.router.currentRoute) }
  get options () { return this.$.router.options }

  get listening () { return this.$.router.listening }
  set listening (v: boolean) { this.$.router.listening = v }

  addRoute (...args: Params<VueRouter['addRoute']>) { return run(this.$.router, this.$.router.addRoute, arguments) }
  removeRoute (...args: Params<VueRouter['removeRoute']>) { return run(this.$.router, this.$.router.removeRoute, arguments) }
  hasRoute (...args: Params<VueRouter['hasRoute']>) { return run(this.$.router, this.$.router.hasRoute, arguments) }
  getRoutes (...args: Params<VueRouter['getRoutes']>) { return run(this.$.router, this.$.router.getRoutes) }
  resolve (...args: Params<VueRouter['resolve']>) { return run(this.$.router, this.$.router.resolve, arguments) }

  /* Extended functionality of these methods */
  push (...args: Params<VueRouter['push']>) { return run(this.$, this.$.push, arguments) }
  replace (...args: Params<VueRouter['replace']>) { return run(this.$, this.$.replace, arguments) }
  back (...args: Params<VueRouter['back']>) { return run(this.$, this.$.back) }
  forward (...args: Params<VueRouter['forward']>) { return run(this.$, this.$.forward) }
  go (...args: Params<VueRouter['go']>) { return run(this.$, this.$.go, arguments) }
  /* Extensions end */

  beforeEach (...args: Params<VueRouter['beforeEach']>) { return run(this.$.router, this.$.router.beforeEach, arguments) }
  beforeResolve (...args: Params<VueRouter['beforeResolve']>) { return run(this.$.router, this.$.router.beforeResolve, arguments) }
  afterEach (...args: Params<VueRouter['afterEach']>) { return run(this.$.router, this.$.router.afterEach, arguments) }
  onError (...args: Params<VueRouter['onError']>) { return run(this.$.router, this.$.router.onError, arguments) }
  isReady (...args: Params<VueRouter['isReady']>) { return run(this.$.router, this.$.router.isReady) }
  install (...args: Params<VueRouter['install']>) { return run(this.$.router, this.$.router.install, arguments) }
}

Traits(Router, [UseCapsule])
export interface Router extends UseCapsule {}