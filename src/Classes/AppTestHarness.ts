import 'reflect-metadata'
import { vi } from 'vitest'
import { Kernel } from '@/index'
import { FakeRouterGateway } from './Routing/FakeRouterGateway'
import { FakeHttpGateway } from './Core/FakeHttpGateway'
import { LoginRegisterPresenter } from './Auth/LoginRegisterPresenter.js'
import { SingleBooksResultStub } from './Stubs/SingleBooksResultStub'
import { Router } from './Routing/Router'
import { App } from './App'

import { HttpGateway } from '@/Classes/Core/HttpGateway';
import { RouterGateway } from '@/Classes/Routing/RouterGateway';


export class AppTestHarness {
  container

  dataGateway

  loginRegisterPresenter

  routerPresenter

  router

  routerGateway

  // 1. set up the app
  appPresenter

  routerRepository

  init() {
    this.container = new Kernel().init()

    this.container.bind(HttpGateway).to(FakeHttpGateway).inSingletonScope()
    this.container.bind(RouterGateway).to(FakeRouterGateway).inSingletonScope()

    this.appPresenter = this.container.get(App)
    this.router = this.container.get(Router)
    this.routerGateway = this.container.get(RouterGateway)

    this.routerGateway.go = vi.fn().mockImplementation((name) => {
      // pivot
      this.router.updateRoute(name, null, null)
    })


    this.loginRegisterPresenter = this.container.get(LoginRegisterPresenter)


  }

  // 2. bootstrap the app
  bootStrap(onRouteChange) {
    this.appPresenter.load(onRouteChange)
  }

  // 3. login or register to the app
  setupLogin = async (loginStub, type) => {

    this.dataGateway = this.container.get(HttpGateway)

    this.dataGateway.get = vi.fn().mockImplementation((path) => {
      // return Promise.resolve(SingleBooksResultStub())
    })

    this.dataGateway.post = vi.fn().mockImplementation((path) => {
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
