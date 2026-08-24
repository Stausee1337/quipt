import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
    plugins: [solid()],
    optimizeDeps: {
        exclude: ['mupdf'] // Exclude mupdf from pre-bundling
    },
    resolve: {
        tsconfigPaths: true
    }
})
