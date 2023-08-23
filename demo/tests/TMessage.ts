import { use } from '@/index'
import type { Null } from '@/types/core'

export class $TMessage {

  appMessages: Null<any[]> = null

  clientMessages: Null<any[]> = null

  constructor () {
    this.reset()
  }

  reset () {
    this.appMessages = []
    this.clientMessages = []
  }

  unpack (dto: any) {
    return { 
      success: dto.success, 
      serverMessage: dto.result.message 
    }
  }
}

export class TMessage {

  get $ () { return use($TMessage) }

  showWarning: Null<boolean> = null

  init () {
    this.showWarning = false
    this.reset()
  }

  reset () {}

  get appMessages () {
    return this.$.appMessages
  }

  get clientMessages () {
    return this.$.clientMessages
  }

  unpack (pm: any, userMessage: any) {
    this.showWarning = !pm.success
    this.$.appMessages = pm.success ? [userMessage] : [pm.serverMessage]
  }
}
