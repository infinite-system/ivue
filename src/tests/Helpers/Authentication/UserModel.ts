import { injectable } from 'inversify'
import { use, $ } from '@/tests/Helpers/IOC/IOC'
import type { AppPresenter } from "@/tests/Helpers/AppPresenter.js";

@injectable()
export class UserModel {

  @use($.AppPresenter) app: AppPresenter

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
