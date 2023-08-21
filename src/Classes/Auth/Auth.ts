import { use } from '@/index'
import { User } from './User'
import { HttpGateway } from '@/Classes/Core/HttpGateway';
import { Messages } from '@/Classes/Core/Messages/Messages';


export class Auth {
  http = use(HttpGateway)
  user = use(User)
  messages = use(Messages)

  originalVariable = [
    { test: 'val-1', test2: 'val-2' }
  ]

  testVariable = [{ test1: 'test1!', test2: 'test1!', sub: { test: 'yes' } }]
  testVariable2 = {
    awesome: {
      super: 'yes'
    }
  }

  async login (email, password) {

    const login = await this.http.post(
      '/login', { email, password }
    )

    if (login.success) {
      this.user.email = email
      this.user.token = login.result.token
    }

    return this.messages.$.unpackData(login)
  }

  async register (email, password) {

    const registerDto = await this.http.post(
      '/register', { email, password }
    )

    return this.messages.$.unpackData(registerDto)
  }

  async logout () {
    this.user.email = ''
    this.user.token = ''
  }
}
