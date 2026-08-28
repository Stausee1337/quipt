import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [tailwindcss(), solid()],
    optimizeDeps: {
        exclude: ['mupdf'] // Exclude mupdf from pre-bundling
    },
    resolve: {
        tsconfigPaths: true
    }
})
