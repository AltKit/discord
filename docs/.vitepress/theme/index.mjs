import DefaultTheme from 'vitepress/theme';
import ApiCatalog from './components/ApiCatalog.vue';
import './style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ApiCatalog', ApiCatalog);
  },
};
