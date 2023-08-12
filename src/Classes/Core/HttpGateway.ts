import { injectable } from 'inversify'
import { Config } from './Config'
import { UserModel } from '../Authentication/UserModel'
import { use } from '@/Kernel'

@injectable()
export class HttpGateway {

  get config () { return use(Config) }
  get userModel () { return use(UserModel) }

  async get (path) {
    const response = await fetch(this.config.apiUrl + path, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.userModel.token,
      },
    })
    const dto = response.json()
    return dto
  }

  async post (path, requestDto) {
    const response = await fetch(this.config.apiUrl + path, {
      method: 'POST',
      body: JSON.stringify(requestDto),
      headers: {
        'Content-Type': 'application/json',
         Authorization: this.userModel.token,
      },
    })
    const dto = response.json()
    return dto
  }

  async delete (path) {
    const response = await fetch(this.config.apiUrl + path, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.userModel.token,
      },
    })
    const dto = response.json()
    return dto
  }
}
