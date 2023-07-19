import { injectable } from 'inversify'

@injectable()
export class MessagesRepository {

  appMessages = null
  clientMessages = null

  constructor () {
    this.reset()
  }

  reset () {
    this.appMessages = []
    this.clientMessages = []
  }
}
