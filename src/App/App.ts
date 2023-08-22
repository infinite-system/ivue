import { Message } from './Services/Message/Message'
import { Router } from './Services/Routing/Router'
import { use } from '@/index'
import routes from '@/App/Services/Routing/Routes'
export class App {

  get router () { return use(Router) }
  
  get message () { return use(Message) }

  load () {
    this.router.$.register(routes)
  }
}

