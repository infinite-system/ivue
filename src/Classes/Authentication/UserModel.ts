import { injectable } from 'inversify'
import { use } from '@/Kernel'
import { AppPresenter } from "@/Classes/AppPresenter.js";

@injectable()
export class UserModel {

  get app () { return use(AppPresenter) }

  email = ''
  token = ''

  get upperCaseEmail () {
    return String(this.email).toUpperCase()
  }

  get dashedUppercaseEmail () {
    return this.upperCaseEmail.split('')
  }

  constructor () {}
}
