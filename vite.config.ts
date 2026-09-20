import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { svgSprite } from './vite/svg-sprite-plugin.ts';

export default defineConfig({
    plugins: [
        tailwindcss(),
        react(),
        svgSprite({ iconDir: 'src/icons' })
    ],
    resolve: {
        tsconfigPaths: true
    }
})

