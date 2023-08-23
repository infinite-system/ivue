import { use } from '@/index'

import { Message } from './Services/Message/Message'
import { Router } from './Services/Routing/Router'

import routes from './Services/Routing/Routes'
import { Auth } from './Auth/Auth'
import { User } from './Auth/User'


export class App {

  get router () { return use(Router) }
  
  get message () { return use(Message) }

  get auth () { return use(Auth) }

  get user () { return use(User) }

  load () {
    this.router.$.register(routes)
    return this
  }
}

// 