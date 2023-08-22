import 'reflect-metadata'
import { createApp } from "vue";
import AppComponent from "./App.vue";
import { VueDd } from 'vue-dd'
import { bind } from '../src'

import router from './router'
import { Http } from '@/App/Services/Http/Http';
import { App } from '@/App/App';
import { Router } from '@/App/Services/Routing/Router';


export function initKernel () {
  bind(App).singleton().ivue()
  bind(Router).singleton().ivue()
  bind(Http).singleton().ivue()
}

initKernel()

const app = createApp(AppComponent);

app.use(router)
app.component('VueDd', VueDd)
app.mount("#app");
