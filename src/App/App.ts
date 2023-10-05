import { use } from '@/index'

import { Message } from './Services/Message/Message'
import { Router } from './Services/Routing/Router'

import routes from './Services/Routing/Routes'
import { Auth } from './Auth/Auth'
import { User } from './Auth/User'
import { IVueTests } from '../../demo/tests/IVueTests'


export class App {

  get router () { return use(Router) }
  
  get user () { return use(User) }

  get auth () { return use(Auth) }

  get message () { return use(Message) }

  get ivue () { return use(IVueTests) }

  load () {
    this.router.$.register(routes)
    return this
  }
}

// 