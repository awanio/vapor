import DefaultTheme from 'vitepress/theme'
import { onMounted } from 'vue'
import Layout from './Layout.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // Add any custom components or plugins here
  },
  setup() {
    onMounted(() => {
      // Set dark theme as default on first visit
      const theme = localStorage.getItem('vitepress-theme-appearance')
      if (!theme) {
        localStorage.setItem('vitepress-theme-appearance', 'dark')
        document.documentElement.classList.add('dark')
      }
    })
  }
}
