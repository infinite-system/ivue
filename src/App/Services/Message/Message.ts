import { use } from '@/index'
import type { Null } from '@/types/core'

export class $Message {

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

export class Message {

  get $ () { return use($Message) }

  showWarning: Null<boolean> = null

  init () {
    this.showWarning = false
    this.$.reset()
  }

  get appMessages () {
    return this.$.appMessages
  }

  get clientMessages () {
    return this.$.clientMessages
  }

  show (pm: any, userMessage: any) {
    this.showWarning = !pm.success
    this.$.appMessages = pm.success ? [userMessage] : [pm.serverMessage]
  }
}
