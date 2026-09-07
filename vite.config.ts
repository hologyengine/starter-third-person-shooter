import hologyBuild from '@hology/vite-plugin'
import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rendererConfigRoot = fileURLToPath(new URL('.', import.meta.url))
const hologyCoreSource = resolve(rendererConfigRoot, '../hology/packages/core/src')
const hologyReactSource = resolve(rendererConfigRoot, '../hology/packages/react/src')
const hologyWebGpuRendererSource = resolve(rendererConfigRoot, '../hology/packages/webgpu-renderer/src')
const signalsReactPackage = resolve(rendererConfigRoot, 'node_modules/@preact/signals-react')
const localHologyAliases = [
  { find: '@hology/core', replacement: hologyCoreSource },
  { find: '@hology/react', replacement: hologyReactSource },
  { find: '@hology/webgpu-renderer', replacement: hologyWebGpuRendererSource },
  { find: '@preact/signals-react', replacement: signalsReactPackage }
].filter(({ replacement }) => existsSync(replacement))

// https://vitejs.dev/config/
export default defineConfig({
  worker: {
    format: 'es'
  },
  resolve: {
    // Prefer local engine sources when present, otherwise use the installed packages.
    alias: localHologyAliases,
    dedupe: ['three', 'react', 'react-dom', 'rxjs', 'three-shader-graph', '@hology/nebula']
  },
  server: {
    fs: {
      allow: [rendererConfigRoot, ...localHologyAliases.map(({ replacement }) => replacement)]
    }
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
