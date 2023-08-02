import { injectable } from 'inversify'
import { lazy } from '@/tests/Helpers/Container.ts'
import { AppPresenter } from "@/tests/Helpers/AppPresenter.js";
import { Store } from "@/tests/Helpers/Core/Store.js";

@injectable()
export class UserModel {

  @lazy(Store.AppPresenter) app: AppPresenter

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
