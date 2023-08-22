import 'reflect-metadata'
import { vi } from 'vitest'
import { bind, use } from '@/index'

import { FakeRouter } from './Services/Routing/FakeRouter'
import { FakeHttp } from './Services/Http/FakeHttp'

import { App } from './App'
import { Http } from '@/App/Services/Http/Http';
import { Router } from './Services/Routing/Router'
import { Auth } from './Auth/Auth.js'

import { SingleBooksResultStub } from './Stubs/SingleBooksResultStub'

export class AppTestHarness {

  app!: App

  http!: Http

  auth!: Auth

  router!: Router

  init() {

    bind(Http).to(FakeHttp).singleton().ivue()
    bind(Router).to(FakeRouter).singleton().ivue()

    this.app = use(App)
    this.router = use(Router)

    this.router.push = vi.fn().mockImplementation(to => {
      // pivot
      this.router.$.updateRoute(to)
    })

    this.auth = use(Auth)
  }

  // 2. bootstrap the app
  bootStrap() {
    this.app.load()
  }

  // 3. login or register to the app
  setupLogin = async (loginStub, type) => {

    this.http.get = vi.fn().mockImplementation((path) => {
      // return Promise.resolve(SingleBooksResultStub())
    })

    this.http.post = vi.fn().mockImplementation((path) => {
      return Promise.resolve(loginStub())
    })
    //
    // this.loginRegisterPresenter = this.container.get(TestPresenter)
    // this.loginRegisterPresenter.email = 'a@b.com'
    // this.loginRegisterPresenter.password = '123'
    // await this.loginRegisterPresenter.login()
    // return this.loginRegisterPresenter
  }
}
