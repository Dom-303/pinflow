// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'PinFlow Preview - Nuxt 3',
    },
  },
  modules: ['@pinflow/nuxt'],
  domscribe: {
    debug: false,
    overlay: true,
  },
});
