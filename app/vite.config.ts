/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  // BASE_PATH é definido no CI para deploy em subcaminho (GitHub Pages)
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'EF Design Studio',
        short_name: 'EF Design',
        description:
          'Produção de peças de design a partir de templates — social, slides e PDF. 100% no navegador.',
        lang: 'pt-BR',
        display: 'standalone',
        background_color: '#EDEDEA',
        theme_color: '#F9F8F5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell completo em cache — requisito: 100% offline após o 1º load
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@auth': fileURLToPath(new URL('./src/auth', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@export': fileURLToPath(new URL('./src/export', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
