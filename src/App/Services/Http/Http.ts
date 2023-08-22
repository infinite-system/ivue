import { Config } from '../../Config'
import { User } from '../../Auth/User'
import { use } from '@/index'

export class Http {

  get config () { return use(Config) }

  get user () { return use(User) }

  setHeaders () {
    return {
      'Content-Type': 'application/json',
      Authorization: this.user.token as string,
    }
  }

  async get (path: string) {

    const response = await fetch(
      this.config.apiUrl + path, {
      method: 'GET',
      headers: this.setHeaders()
    })

    return response.json()
  }

  async post (path: string, req: {}) {

    const response = await fetch(
      this.config.apiUrl + path, {
      method: 'POST',
      body: JSON.stringify(req),
      headers: this.setHeaders()
    })

    return response.json()
  }

  async delete (path: string) {

    const response = await fetch(
      this.config.apiUrl + path, {
      method: 'DELETE',
      headers: this.setHeaders()
    })

    return response.json()
  }
}
