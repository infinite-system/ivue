import { createApp } from 'vue';
import App from './modules/app/App.vue';
import { AppRouter } from './modules/app/AppRouter';
import './styles.css';

createApp(App).use(AppRouter.Class.$router).mount('#app');
