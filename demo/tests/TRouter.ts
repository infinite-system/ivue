import { TMessage } from './TMessage'
import { TUser } from './TUser'
import { use } from '@/index'

export class $TRouter {

  get user () { return use(TUser) }

  get message () { return use(TMessage) }

}

export class TRouter {

  get $ () { return use($TRouter) }

  test = 1
}
