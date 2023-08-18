import { MessagesRepository } from '../Core/Messages/MessagesRepository'
import { RouterRepository } from './RouterRepository'
import { UserModel } from '../Authentication/UserModel'
import { use } from '@/kernel'

export class Router {

  get routerRepository () { return use(RouterRepository) }
  get userModel () { return use(UserModel) }
  get messagesRepository () { return use(MessagesRepository) }

  get currentRoute() {
    return this.routerRepository.currentRoute
  }

  constructor() {}

   updateCurrentRoute = async (newRouteId, params, query)  => {

    const oldRoute = this.routerRepository.findRoute(this.currentRoute.routeId)
    const newRoute = this.routerRepository.getNewRoute(newRouteId)

    const hasToken = !!this.userModel.token

    const routeChanged = oldRoute.routeId !== newRoute.routeId

     console.log('newRouteId', newRouteId, 'oldRoute.routeId', oldRoute.routeId, 'newRoute.routeId', newRoute.routeId)

    const protectedOrUnauthenticatedRoute =
      (newRoute.routeDef.isSecure && hasToken === false) || newRoute.routeDef.routeId === '*'
    const publicOrAuthenticatedRoute =
      (newRoute.routeDef.isSecure && hasToken === true) || newRoute.routeDef.isSecure === false

     console.log('routeChanged', routeChanged,
       'protectedOrUnauthenticatedRoute', protectedOrUnauthenticatedRoute,
       'publicOrAuthenticatedRoute', publicOrAuthenticatedRoute,
       'newRoute', newRoute
     )
    if (routeChanged) {
      this.routerRepository.onRouteChanged()

      if (protectedOrUnauthenticatedRoute) {

        // setTimeout(() =>
          this.routerRepository.goToId('loginLink')
          // , 0)
        return false

      } else if (publicOrAuthenticatedRoute) {

        if (oldRoute.onLeave) oldRoute.onLeave()
        if (newRoute.onEnter) newRoute.onEnter()

        this.routerRepository.currentRoute.routeId = newRoute.routeId
        this.routerRepository.currentRoute.routeDef = newRoute.routeDef
        this.routerRepository.currentRoute.params = params
        this.routerRepository.currentRoute.query = query
        return true
      }
    }
    return true
  }

  registerRoutes (onRouteChange) {
    this.routerRepository.registerRoutes(this.updateCurrentRoute, onRouteChange)
  }

  async goToId (routeId, params, query) {
    return this.routerRepository.goToId(routeId)
  }
}
