import { inject, injectable } from 'inversify'
import { MessagesRepository } from './Core/Messages/MessagesRepository'
import { Router } from './Routing/Router'


@injectable()
export class AppPresenter {

  @inject(Router) router: Router
  @inject(MessagesRepository) messagesRepository: MessagesRepository

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
