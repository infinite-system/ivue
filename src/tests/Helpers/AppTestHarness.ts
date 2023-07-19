import 'reflect-metadata'
import { vi } from 'vitest'
import { Types } from './Core/Types'
import { BaseIOC } from './BaseIOC'
import { FakeRouterGateway } from './Routing/FakeRouterGateway'
import { FakeHttpGateway } from './Core/FakeHttpGateway'
import { LoginRegisterPresenter } from './Authentication/LoginRegisterPresenter.js'
import { SingleBooksResultStub } from './Stubs/SingleBooksResultStub'
import { Router } from './Routing/Router'
import { AppPresenter } from './AppPresenter'
import { RouterRepository } from './Routing/RouterRepository'


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
    this.container = new BaseIOC().buildBaseTemplate()

    this.container.bind(Types.IDataGateway).to(FakeHttpGateway).inSingletonScope()
    this.container.bind(Types.IRouterGateway).to(FakeRouterGateway).inSingletonScope()

    this.appPresenter = this.container.get(AppPresenter)
    this.router = this.container.get(Router)
    this.routerRepository = this.container.get(RouterRepository)
    this.routerGateway = this.container.get(Types.IRouterGateway)

    this.routerGateway.goToId = vi.fn().mockImplementation((routeId) => {
      // pivot
      this.router.updateCurrentRoute(routeId, null, null)
    })


    this.loginRegisterPresenter = this.container.get(LoginRegisterPresenter)


  }

  // 2. bootstrap the app
  bootStrap(onRouteChange) {
    this.appPresenter.load(onRouteChange)
  }

  // 3. login or register to the app
  setupLogin = async (loginStub, type) => {

    this.dataGateway = this.container.get(Types.IDataGateway)

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
