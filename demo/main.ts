import { createApp } from "vue";
import { VueDd } from 'vue-dd'

import { setup, use } from '@/index'

import AppComponent from "./App.vue";
import { App } from '@/App/App';

const app = use(App).load()
setup({ router: app.router })

const vue = createApp(AppComponent);
console.log('app.router', app.router)
vue.use(app.router)

vue.component('VueDd', VueDd)

vue.mount("#app");
