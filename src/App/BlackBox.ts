import { createApp } from "vue";
import { vi } from 'vitest'
import { setup, bind, use } from '@/index'
import AppComponent from "../../demo/App.vue";
import { FakeRouter } from './Services/Routing/FakeRouter'
import { FakeHttp } from './Services/Http/FakeHttp'

import { App } from './App'
import { Http } from '@/App/Services/Http/Http';
import { Router } from './Services/Routing/Router'
import { Auth } from './Auth/Auth.js'

import { SingleBooksResultStub } from './Stubs/SingleBooksResultStub'

export class BlackBox {

  app!: App

  http!: Http

  auth!: Auth

  router!: Router

  vue!: ReturnType<typeof createApp>

  init() {

    // bind(Http).to(FakeHttp).singleton().ivue()
    // bind(Router).to(FakeRouter).singleton().ivue()

    this.app = use(App).load()
    setup({ router: this.app.router })
    
    // this.vue = createApp(AppComponent);
    
    // console.log('router', this.app.router)
    // this.vue.use(this.app.router)
    
    // this.vue.mount("#app");


    // Object.defineProperty(Router.prototype, 'push', {
    //   value: vi.fn().mockImplementation(to => {
    //     // pivot
    //     this.router.$.beforeRoute(to)
    //   })
    // })

    return this
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
