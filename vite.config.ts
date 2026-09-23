import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { svgSprite } from './frontend/vite/svg-sprite-plugin.ts';
import { customSSR } from './frontend/vite/custom-ssr.ts';

export default defineConfig({
    publicDir: 'frontend/public',
    plugins: [
        tailwindcss(),
        react(),
        svgSprite({ iconDir: './frontend/icons' }),
        customSSR()
    ],
    resolve: {
        tsconfigPaths: true
    },
})

