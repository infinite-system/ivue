import { Auth } from './Auth'
import { Messages } from '../Core/Messages/Messages'
import { Router } from '../Routing/Router'
import { use } from '@/index'
import type { Null } from '@/types/core'

export class LoginRegisterPresenter  {

  auth = use(Auth)

  router = use(Router)

  messages = use(Messages)

  email: Null<string> = null

  password: Null<string> = null
  
  option: Null<string> = null

  reset () {
    this.email = ''
    this.password = ''
    this.option = 'login'
  }

  async login () {
    const login = await this.auth.login(this.email, this.password)

    this.messages.unpack(login, 'User logged in')

    if (login.success) {
      this.router.go('homeLink')
    }
  }

  async register () {
    const register = await this.auth.register(this.email, this.password)
    this.messages.unpack(register, 'User registered')
  }

  async logout () {
    this.auth.logout()
    this.router.go('loginLink')
  }

  formValid () {
    const messages = []

    if (this.email === '') messages.push('No email')
    if (this.password === '') messages.push('No password')

    this.messages.$.clientMessages = messages

    return messages.length === 0
  }
}
