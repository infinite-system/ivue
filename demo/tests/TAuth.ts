import { use } from '@/index'
import { TUser } from './TUser'
import { TMessage } from './TMessage'


export class TAuth {

  user = use(TUser)

  message = use(TMessage)

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
