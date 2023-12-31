import { createApp } from "vue";
import { VueDd } from 'vue-dd'

import { setup, use } from '@/index'

import AppComponent from "./App.vue";
import { App } from '@/App/App';
import { Auth } from '@/App/Auth/Auth';


const app = use(App).load()
setup({ router: app.router, debug: true })

use(Auth)
export const vue = createApp(AppComponent);

console.log('vue', vue);

vue.use(app.router)

vue.component('VueDd', VueDd)

vue.mount("#app");
