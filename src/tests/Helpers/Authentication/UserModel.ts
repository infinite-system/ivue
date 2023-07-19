import { injectable } from 'inversify'
import { lazyInject } from '@/tests/Helpers/Container.ts'
import { AppPresenter } from "@/tests/Helpers/AppPresenter.js";
import { Types } from "@/tests/Helpers/Core/Types.js";

@injectable()
export class UserModel {

  @lazyInject(Types.IAppPresenter) app: AppPresenter

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
