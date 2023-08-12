import { injectable } from 'inversify'
import { MessagesRepository } from './Core/Messages/MessagesRepository'
import { Router } from './Routing/Router'
import { use } from '@/Kernel'

// @injectable()
export class AppPresenter {

  get router () { return use(Router) }
  get messagesRepository () { return use(MessagesRepository) }

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

