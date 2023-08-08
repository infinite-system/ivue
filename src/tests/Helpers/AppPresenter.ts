import { injectable } from 'inversify'
import type { MessagesRepository } from './Core/Messages/MessagesRepository'
import type { Router } from './Routing/Router'
import { use, $ } from '@/tests/Helpers/IOC/IOC'

@injectable()
export class AppPresenter {

  @use($.Router) router: Router
  @use($.MessagesRepository) messagesRepository: MessagesRepository

  get currentRoute () {
    return this.router.currentRoute
  }

  constructor () {}

  load (onRouteChange = () => {}) {

    const onRouteChangeWrapper = () => {
      this.messagesRepository.appMessages = []
      onRouteChange()
    }

    this.router.registerRoutes(onRouteChangeWrapper)
  }
}
