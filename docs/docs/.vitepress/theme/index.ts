// .vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import { Quasar, Notify, Dialog } from 'quasar'
import { createPinia } from 'pinia'
import '@shikijs/vitepress-twoslash/style.css'
import '@quasar/extras/material-icons/material-icons.css'
import '@quasar/extras/material-icons-outlined/material-icons-outlined.css'
import '@quasar/extras/material-symbols-outlined/material-symbols-outlined.css'
// import 'quasar/dist/quasar.css'

// Import Quasar css
import 'quasar/src/css/index.sass'

import './main.css'

// A few examples for animations from Animate.css:
import '@quasar/extras/animate/fadeIn.css'
import '@quasar/extras/animate/fadeOut.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(TwoslashFloatingVue);
    
    const pinia = createPinia();
    app.use(pinia);

    app.use(Quasar, {
      ripple: true,
      plugins: {
        Notify,
        Dialog
      },
      config: {
        animations: 'all',
        brand: {
          primary: '#007ea7',
          secondary: '#003459',
          accent: '#00171f'
        },
      }
    }, { req: { headers: {} } })
  },
}
