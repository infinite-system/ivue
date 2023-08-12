import { injectable } from 'inversify'
import { Router } from '../Routing/Router'
import { UserModel } from './UserModel'
import { MessagePacking } from '../Core/Messages/MessagePacking'
import { HttpGateway } from '@/Classes/Core/HttpGateway';
import { use } from '@/Kernel'

@injectable()
export class AuthRepository {

  get router () { return use(Router) }
  get http () { return use(HttpGateway) }
  get userModel () { return use(UserModel) }

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
    const loginDto = await this.http.post('/login', {
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
    const registerDto = await this.http.post('/register', {
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
