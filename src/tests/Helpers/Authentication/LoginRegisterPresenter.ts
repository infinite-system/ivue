import { inject, injectable } from 'inversify'
import type { AuthRepository } from './AuthRepository'
import type { MessagesRepository } from '../Core/Messages/MessagesRepository'
import type { Router } from '../Routing/Router'

import { lazy, Inject } from '@/tests/Helpers/IOC/IOC'
import { MessagesPresenter } from "@/tests/Helpers/Core/Messages/MessagesPresenter";

@injectable()
export class LoginRegisterPresenter extends MessagesPresenter {

  @lazy(Inject.AuthRepository) authenticationRepository: AuthRepository
  @lazy(Inject.MessagesRepository) messagesRepository: MessagesRepository
  @lazy(Inject.Router) router: Router

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
