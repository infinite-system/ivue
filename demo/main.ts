import 'reflect-metadata'
import { createApp } from "vue";
import App from "./App.vue";
import { VueDd } from 'vue-dd'
import { kernel } from '../src'

import router from './router'
// import { RouterRepository } from '../src/Classes/Routing/RouterRepository';
// import { Router } from '../src/Classes/Routing/Router';
// import { MessagesRepository } from '../src/Classes/Core/Messages/MessagesRepository';
// import { NavigationRepository } from '../src/Classes/Navigation/NavigationRepository';
// import { UserModel } from '../src/Classes/Authentication/UserModel';
// import { AuthRepository } from '../src/Classes/Authentication/AuthRepository';
// import { XVueTestClass } from '../src/Classes/Authentication/XVueTestClass';
// import { LoginRegisterPresenter } from '../src/Classes/Authentication/LoginRegisterPresenter';
// import { Config } from '../src/Classes/Core/Config';
// import { TestClass } from '../src/Classes/Test/TestClass';
// import { TestClass2 } from '../src/Classes/Test/TestClass2';
import { HttpGateway } from '../src/Classes/Core/HttpGateway';
import { RouterGateway } from '../src/Classes/Routing/RouterGateway';
import { AppPresenter } from '../src/Classes/AppPresenter';

export function initBaseKernel () {
  return kernel
}

export function initKernel () {
  initBaseKernel()
    .bind(HttpGateway).singleton().ivue()
    .bind(RouterGateway).singleton().ivue()
    .bind(AppPresenter).singleton().ivue()
}

initKernel()

const app = createApp(App);

app.use(router)
app.component('VueDd', VueDd)
app.mount("#app");
