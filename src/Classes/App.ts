import { Messages } from './Core/Messages/Messages'
import { Router } from './Routing/Router'
import { use } from '@/index'
import routes from '@/Classes/Routing/Routes'
export class App {

  get router () { return use(Router) }
  
  get messages () { return use(Messages) }

  load () {
    this.router.$.register(routes)
  }
}

