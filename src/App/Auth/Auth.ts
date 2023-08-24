import { use } from '@/index'
import { Traits } from '@/index'
import { User } from './User'
import { Http } from '@/App/Services/Http/Http';
import { $Message, Message } from '@/App/Services/Message/Message';
import { Router } from '@/App/Services/Routing/Router'
import type { Null } from '@/types/core'
import { UseCapsule } from '@/traits/UseCapsule';

export class $Auth {

  get http () { return use(Http) }
  get user () { return use(User) }
  get $message () { return use($Message) }

  async login (email: Null<string>, password: Null<string>) {

    const login = await this.http.post(
      '/login', { email, password }
    )

    if (login.success) {
      this.user.email = email
      this.user.token = login.result.token
    }

    return this.$message.unpack(login)
  }

  async register (email: Null<string>, password: Null<string>) {

    const registerDto = await this.http.post(
      '/register', { email, password }
    )

    return this.$message.unpack(registerDto)
  }

  async logout () {
    this.user.email = ''
    this.user.token = ''
  }
}


export class Auth  {

  capsule = $Auth
  constructor() {
    this.useCapsule()
  }

  get router () { return use(Router) }
  get message () { return use(Message) }

  email: Null<string> = null
  password: Null<string> = null
  option: Null<string> = null

  init(){
    this.option = 'login'
    this.email = 'ekalashnikov@gmail.com'
    this.password = 'test1234'
  }

  reset () {
    this.email = ''
    this.password = ''
    this.option = 'login'
  }

  formValid () {
    const message = []

    if (this.email === '') message.push('No email')
    if (this.password === '') message.push('No password')

    this.message.$.clientMessages = message

    return message.length === 0
  }

  async login () {
    const login = await this.$.login(this.email, this.password)

    this.message.show(login, 'User logged in')

    if (login.success) {
      this.router.push({ name: 'home' })
    }
  }

  async register () {
    const register = await this.$.register(this.email, this.password)
    this.message.show(register, 'User registered')
  }

  async logout () {
    this.$.logout()
    this.router.push({ name: 'login' })
  }
}

Traits(Auth, [UseCapsule])
export interface Auth extends UseCapsule {}