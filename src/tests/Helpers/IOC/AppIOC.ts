// Classes
import { AppPresenter } from '../AppPresenter'
import { RouterRepository } from '../Routing/RouterRepository'
import { MessagesRepository } from '../Core/Messages/MessagesRepository'
import { Router } from '../Routing/Router'
import { UserModel } from '../Authentication/UserModel'
import { NavigationRepository } from '../Navigation/NavigationRepository'
import { LoginRegisterPresenter } from "../Authentication/LoginRegisterPresenter.js";
import { XVueTestClass } from "../Authentication/XVueTestClass.js";
import { AuthRepository } from "@/tests/Helpers/Authentication/AuthRepository.js";
import { Config } from '@/tests/Helpers/Core/Config'
import { httpGateway } from "@/tests/Helpers/Core/HttpGateway";
import { RouterGateway } from "@/tests/Helpers/Routing/RouterGateway";
import { iVueBuilder } from '@/iVue'
// Container
import { IOC, IOCMap, $ } from '@/tests/Helpers/IOC/IOC'

export class AppIOC {
  container

  constructor () {
    this.container = IOC
  }

  singleton (from, to = null) {

    // Container Map allows for HMR support for Vite
    // It breaks otherwise because the container tries
    // to rebind classes on reload
    if (IOCMap.has(from)) return

    to = to ?? from

    this.container.bind(from).to(to)
      .inSingletonScope()
      .onActivation(iVueBuilder);

    IOCMap.set(from, true)
  }

  initBase () {
    this.singleton($.RouterRepository, RouterRepository)
    this.singleton($.Router, Router)

    this.singleton($.MessagesRepository, MessagesRepository)
    this.singleton($.NavigationRepository, NavigationRepository)
    this.singleton($.UserModel, UserModel)
    this.singleton($.AuthRepository, AuthRepository)

    this.singleton($.XVueTestClass, XVueTestClass)
    this.singleton($.LoginRegisterPresenter, LoginRegisterPresenter)
    this.singleton($.Config, Config)

    return this
  }

  init () {
    this.initBase()

    this.singleton($.DataGateway, httpGateway)
    this.singleton($.RouterGateway, RouterGateway)
    this.singleton($.AppPresenter, AppPresenter)
  }

  get (value) {
    return this.container.get(value)
  }

  bind (value) {
    return this.container.bind(value)
  }

}

export const appIOC = new AppIOC()