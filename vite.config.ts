import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { svgSprite } from './frontend/vite/svg-sprite-plugin.ts';
// import { spaFallback } from './frontend/vite/spa-fallback-plugin.ts';
import { customSSR } from './frontend/vite/custom-ssr/index.ts';


export default defineConfig({
    publicDir: 'frontend/public',
    plugins: [
        tailwindcss(),
        react(),
        svgSprite({ iconDir: './frontend/icons' }),
        // spaFallback('./frontend/public/app.html'),
        customSSR({
            routesMoudle: './frontend/config/routes'
        })
    ],
    resolve: {
        tsconfigPaths: true
    },
})

