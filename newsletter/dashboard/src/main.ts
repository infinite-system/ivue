import { createApp } from 'vue';
import { Quasar } from 'quasar';
import { Dialog, Notify } from 'quasar';
import iconSet from 'quasar/icon-set/svg-material-icons';
import App from './modules/app/App.vue';
import { AppRouter } from './modules/app/AppRouter';
import { QuasarTheme } from './modules/app/QuasarTheme';
import 'quasar/dist/quasar.css';
import './styles.css';

createApp(App)
  .use(Quasar, {
    plugins: { Dialog, Notify },
    iconSet,
    config: QuasarTheme.Class.CONFIG,
  })
  .use(AppRouter.Class.$router)
  .mount('#app');
