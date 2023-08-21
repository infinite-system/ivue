import { TMessages } from './TMessages'
import { TUser } from './TUser'
import { use } from '@/index'

export class $TRouter {

  get user () { return use(TUser) }

  get messages () { return use(TMessages) }

}

export class TRouter {

  get $ () { return use($TRouter) }

}
