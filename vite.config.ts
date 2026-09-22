import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { svgSprite } from './frontend/vite/svg-sprite-plugin.js';
import { spaFallback } from './frontend/vite/spa-fallback-plugin.js';


const entrypoints = {
    app: './frontend/public/app.html'
};

export default defineConfig({
    appType: 'mpa',
    publicDir: 'frontend/public',
    plugins: [
        // {
        //     name: '',
        //     configureServer(server) {
        //         server.middlewares.use(function eavestropper(x, y, z) { 
        //             console.log(server.middlewares.stack.map(x => x.handle?.name));
        //             z();
        //         });
        //         return () => {
        //             server.middlewares.use(function stinkyMiddleware(req, _, z) {
        //                 // console.log('stinkyMiddleware', req.url);
        //                 z();
        //             });
        //             // console.log(server.middlewares.stack.map(x => x.handle?.name));
        //         };
        //     }
        // },
        tailwindcss(),
        react(),
        svgSprite({ iconDir: 'frontend/icons' }),
        spaFallback('frontend/public/app.html'),
    ],
    resolve: {
        tsconfigPaths: true
    },
    build: {
        rolldownOptions: {
            input: entrypoints
        }
    }
})

