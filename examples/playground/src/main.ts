import { createApp } from 'vue';
import App from './App.vue';
import { registerApp } from './quasar-loader';

const app = createApp(App);
registerApp(app); // field routes install Quasar lazily on first entry
app.mount('#app');
