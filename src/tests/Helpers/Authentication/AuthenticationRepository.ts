import { inject, injectable } from 'inversify'
import { Store } from '../Core/Store'
import { Router } from '../Routing/Router'
import { UserModel } from './UserModel'
import { MessagePacking } from '../Core/Messages/MessagePacking'
import { RouterGateway } from "../Routing/RouterGateway";


@injectable()
export class AuthenticationRepository {

  @inject(Router) router: Router

  @inject(Store.DataGateway) dataGateway: RouterGateway

  @inject(UserModel) userModel: UserModel


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
