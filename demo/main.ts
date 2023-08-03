import 'reflect-metadata'
import { createApp } from "vue";
import App from "./App.vue";
import { VueDd } from 'vue-dd'
import { appIOC } from '../src/tests/Helpers/IOC/AppIOC'

appIOC.init()
const app = createApp(App);

app.component('VueDd', VueDd)
app.mount("#app");
