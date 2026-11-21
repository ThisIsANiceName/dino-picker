import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'

// Self-hosted fonts (no CDN; app works offline). Family names are listed in docs/ux-spec.md.
import '@fontsource/caprasimo/400'
import '@fontsource/schibsted-grotesk/400'
import '@fontsource/schibsted-grotesk/500'
import '@fontsource/schibsted-grotesk/600'
import '@fontsource/schibsted-grotesk/700'
import '@fontsource/schibsted-grotesk/800'
import '@fontsource/schibsted-grotesk/400-italic'
import '@fontsource/graduate/400'
import '@fontsource/fredoka/500'
import '@fontsource/fredoka/700'
import '@fontsource/big-shoulders-display/700'
import '@fontsource/big-shoulders-display/900'
import './style.css'

createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')
