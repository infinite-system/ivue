import { injectable } from 'inversify'
import { MessagesRepository } from './Core/Messages/MessagesRepository'
import { Router } from './Routing/Router'
import { use } from '@/kernel'

// @injectable()
export class AppPresenter {

  get router () { return use(Router) }
  get messagesRepository () { return use(MessagesRepository) }

  get currentRoute () {
    return this.router.currentRoute
  }

  i = 0

  constructor () {}

  load (onRouteChange = () => {}) {

    const onRouteChangeWrapper = () => {
      this.messagesRepository.appMessages = []
      onRouteChange()
    }

    this.router.registerRoutes(onRouteChangeWrapper)
  }
}

