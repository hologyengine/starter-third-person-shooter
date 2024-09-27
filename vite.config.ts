import hologyBuild from '@hology/vite-plugin'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  esbuild: {
    target: "es2020",
  },
  plugins: [
    hologyBuild(),
    react({
      babel: {
        plugins: [
          ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
          ["module:@preact/signals-react-transform"],
        ],
      },
    }),
  ],
})