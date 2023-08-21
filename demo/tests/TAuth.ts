import { use } from '@/index'
import { TUser } from './TUser'
import { TMessages } from './TMessages'


export class TAuth {

  user = use(TUser)

  messages = use(TMessages)

  originalVariable = [
    { test: 'val-1', test2: 'val-2' }
  ]

  testVariable = [{ test1: 'test1!', test2: 'test1!', sub: { test: 'yes' } }]
  testVariable2 = {
    awesome: {
      super: 'yes'
    }
  }

}
