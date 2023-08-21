import { use } from '@/index'
import { App } from "@/Classes/App";

export class User {

  get app () { return use(App) }

  email = ''
  token = ''

  get upperCaseEmail () {
    return String(this.email).toUpperCase()
  }

  get dashedUppercaseEmail () {
    return this.upperCaseEmail.split('')
  }

}
