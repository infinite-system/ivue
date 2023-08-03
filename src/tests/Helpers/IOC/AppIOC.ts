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
import { IOC, IOCMap, Inject } from '@/tests/Helpers/IOC/IOC'

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
    this.singleton(Inject.RouterRepository, RouterRepository)
    this.singleton(Inject.Router, Router)

    this.singleton(Inject.MessagesRepository, MessagesRepository)
    this.singleton(Inject.NavigationRepository, NavigationRepository)
    this.singleton(Inject.UserModel, UserModel)
    this.singleton(Inject.AuthRepository, AuthRepository)

    this.singleton(Inject.XVueTestClass, XVueTestClass)
    this.singleton(Inject.LoginRegisterPresenter, LoginRegisterPresenter)
    this.singleton(Inject.Config, Config)

    return this
  }

  init () {
    this.initBase()

    this.singleton(Inject.DataGateway, httpGateway)
    this.singleton(Inject.RouterGateway, RouterGateway)
    this.singleton(Inject.AppPresenter, AppPresenter)
  }

  get (value) {
    return this.container.get(value)
  }

  bind (value) {
    return this.container.bind(value)
  }

}

export const appIOC = new AppIOC()