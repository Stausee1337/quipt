import { defineConfig } from 'vite'
import { resolve } from 'path'
import solid from 'vite-plugin-solid'

export default defineConfig({
    plugins: [solid()],
    optimizeDeps: {
        exclude: ['mupdf'] // Exclude mupdf from pre-bundling
    },
})
