import { inject, injectable } from 'inversify'
import { MessagesRepository } from './MessagesRepository'

export abstract class GrandParent {
  grandParentProp = 1
}

@injectable()
export abstract class MessagesPresenter extends GrandParent {

  @inject(MessagesRepository) messagesRepository: MessagesRepository

  nonObservedProp = 'test'

  showValidationWarning = null

  constructor () {
    super()
  }

  init () {
    this.showValidationWarning = false
    this.reset()
  }

  abstract reset (): void

  get messages () {
    return this.messagesRepository.appMessages
  }

  get clientMessages () {
    return this.messagesRepository.clientMessages
  }

  unpackRepositoryPmToVm (pm, userMessage) {
    this.showValidationWarning = !pm.success
    this.messagesRepository.appMessages = pm.success ? [userMessage] : [pm.serverMessage]
  }
}
