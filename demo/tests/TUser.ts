import { use } from '@/kernel'
import { TApp } from "./TApp";

export class TUser {

  get app () { return use(TApp) }

  email = ''
  token = ''

  get upperCaseEmail () {
    return String(this.email).toUpperCase()
  }

  get dashedUppercaseEmail () {
    return this.upperCaseEmail.split('')
  }

}
