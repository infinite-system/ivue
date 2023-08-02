import { AppPresenter } from './AppPresenter'
import { RouterRepository } from './Routing/RouterRepository'
import { MessagesRepository } from './Core/Messages/MessagesRepository'
import { Router } from './Routing/Router'
import { UserModel } from './Authentication/UserModel'
import { NavigationRepository } from './Navigation/NavigationRepository'
import { LoginRegisterPresenter } from "./Authentication/LoginRegisterPresenter.js";
import { XVueTestClass } from "./Authentication/XVueTestClass.js";
import { AuthenticationRepository } from "@/tests/Helpers/Authentication/AuthenticationRepository.js";
import { container, containerMap } from './container.ts'
import { Store } from "@/tests/Helpers/Core/Store";
import { HttpGateway } from "@/tests/Helpers/Core/HttpGateway";
import { RouterGateway } from "@/tests/Helpers/Routing/RouterGateway";
import { iVueBuilder } from '@/iVue'

export class BaseIOC {
  container

  constructor () {
    this.container = container
  }

  singleton (from, to = null) {

    // Container Map allows for HMR support for Vite
    // It breaks otherwise because the container tries
    // to rebind classes on reload
    if (containerMap.has(from)) return

    to = to ?? from

    this.container.bind(from).to(to)
      .inSingletonScope()
      .onActivation(iVueBuilder);

    containerMap.set(from, true)
  }

  init () {

    this.singleton(Store.DataGateway, HttpGateway)
    this.singleton(Store.RouterGateway, RouterGateway)
    this.singleton(Store.AppPresenter, AppPresenter)

    this.singleton(RouterRepository)
    this.singleton(Router)

    this.singleton(MessagesRepository);
    this.singleton(NavigationRepository)
    this.singleton(UserModel)
    this.singleton(AuthenticationRepository)

    this.singleton(XVueTestClass)
    this.singleton(LoginRegisterPresenter)

    return this.container
  }
}
