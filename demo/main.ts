import { createApp } from "vue";
import { VueDd } from "vue-dd";
import router from "./router";
import App from "./App.vue";

const app = createApp(App);
app.use(router);

app.component("VueDd", VueDd);

app.mount("#app");
