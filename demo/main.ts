import 'reflect-metadata'
import { createApp } from "vue";
import AppComponent from "./App.vue";
import { VueDd } from 'vue-dd'
import { bind } from '../src'

import router from './router'
import { HttpGateway } from '../src/Classes/Core/HttpGateway';
import { RouterGateway } from '../src/Classes/Routing/RouterGateway';
import { App } from '../src/Classes/App';


export function initKernel () {
  bind(HttpGateway).singleton().ivue()
  bind(RouterGateway).singleton().ivue()
  bind(App).singleton().ivue()
}

initKernel()

const app = createApp(AppComponent);

app.use(router)
app.component('VueDd', VueDd)
app.mount("#app");
