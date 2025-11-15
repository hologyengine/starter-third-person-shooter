import hologyBuild from '@hology/vite-plugin'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  worker: {
    format: 'es'
  },
  esbuild: {
    target: 'es2022'
  },
  plugins: [
    hologyBuild(),
    react({
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { version: '2023-11' }],
          ['module:@preact/signals-react-transform']
        ]
      }
    })
  ]
})
