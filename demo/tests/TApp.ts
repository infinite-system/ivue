import { TMessage } from './TMessage'
import { TRouter } from './TRouter'
import { use } from '@/index'

export class TApp {

  get router () { return use(TRouter) }
  
  get message () { return use(TMessage) }

}

