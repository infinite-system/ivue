import { injectable } from 'inversify'
import { AuthRepository } from './AuthRepository'
import { MessagesRepository } from '../Core/Messages/MessagesRepository'
import { Router } from '../Routing/Router'

import { use } from '@/kernel'
import { MessagesPresenter } from "@/Classes/Core/Messages/MessagesPresenter";

@injectable()
export class LoginRegisterPresenter extends MessagesPresenter {

  get authenticationRepository() { return use(AuthRepository) }
  get messagesRepository () { return use(MessagesRepository) }
  get router () { return use(Router) }

  email = null
  password = null
  option = null

  constructor () {
    super()
    this.init()
  }

  reset () {
    this.email = ''
    this.password = ''
    this.option = 'login'
  }

  async login () {
    const loginPm = await this.authenticationRepository.login(this.email, this.password)

    this.unpackRepositoryPmToVm(loginPm, 'User logged in')

    if (loginPm.success) {
      this.router.goToId('homeLink')
    }
  }

  async register () {
    const registerPm = await this.authenticationRepository.register(this.email, this.password)
    this.unpackRepositoryPmToVm(registerPm, 'User registered')
  }

  async logOut () {
    this.authenticationRepository.logOut()
    this.router.goToId('loginLink')
  }

  formValid () {
    const clientValidationMessages = []

    if (this.email === '') clientValidationMessages.push('No email')
    if (this.password === '') clientValidationMessages.push('No password')

    this.messagesRepository.clientMessages = clientValidationMessages

    return clientValidationMessages.length === 0
  }
}
