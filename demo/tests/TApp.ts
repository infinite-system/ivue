import { TMessage } from './TMessage'
import { TRouter } from './TRouter'
import { use } from '@/index'
import { TUser } from './TUser'

export class TApp {

  get router () { return use(TRouter) }
  
  get message () { return use(TMessage) }

  get user () { return use(TUser) }

}

