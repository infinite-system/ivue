import { injectable } from 'inversify'
import type { Router } from '../Routing/Router'
import type { UserModel } from './UserModel'
import type { MessagePacking } from '../Core/Messages/MessagePacking'
import type { RouterGateway } from "../Routing/RouterGateway";
import { use, $ } from '@/tests/Helpers/IOC/IOC'

@injectable()
export class AuthRepository {

  @use($.Router) router: Router

  @use($.DataGateway) dataGateway: RouterGateway

  @use($.UserModel) userModel: UserModel


  originalVariable = [
    {test: 'val-1', test2: 'val-2'}
  ]

  testVariable = [{test1: 'test1!', test2: 'test1!', sub: {test: 'yes'}}]
  testVariable2 = {
    awesome: {
      super: 'yes'
    }
  }

  async login(email, password) {
    const loginDto = await this.dataGateway.post('/login', {
      email,
      password,
    })

    if (loginDto.success) {
      this.userModel.email = email
      this.userModel.token = loginDto.result.token
    }

    return MessagePacking.unpackServerDtoToPm(loginDto)
  }

  async register(email, password) {
    const registerDto = await this.dataGateway.post('/register', {
      email,
      password,
    })

    return MessagePacking.unpackServerDtoToPm(registerDto)
  }

  async logOut() {
    this.userModel.email = ''
    this.userModel.token = ''
  }
}
