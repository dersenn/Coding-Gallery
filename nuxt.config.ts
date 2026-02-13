export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  
  devtools: { enabled: true },
  
  modules: ['@nuxt/ui'],
  
  css: ['~/assets/css/main.css'],
  
  typescript: {
    strict: true,
    typeCheck: true
  },
  
  app: {
    head: {
      title: 'Creative Coding Gallery',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})
