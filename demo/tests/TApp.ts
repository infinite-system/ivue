import { TMessages } from './TMessages'
import { TRouter } from './TRouter'
import { use } from '@/index'

export class TApp {

  get router () { return use(TRouter) }
  
  get messages () { return use(TMessages) }

}

