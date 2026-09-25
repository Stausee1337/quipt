import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import path from 'node:path';
import { readdirSync } from 'node:fs';

import { svgSprite } from './frontend/vite/svg-sprite-plugin.ts';
import { customSSR } from './frontend/vite/custom-ssr.ts';

const jsRoot = path.resolve(import.meta.dirname, 'frontend');

export default defineConfig({
    publicDir: 'frontend/public',
    plugins: [
        tailwindcss(),
        react(),
        svgSprite({ iconDir: './frontend/icons' }),
        customSSR(findEntryPoints())
    ],
    resolve: {
        tsconfigPaths: true
    },
});

function findEntryPoints() {
    const quiptEntrypointsDir = path.resolve(jsRoot, 'quipt/entrypoints');
    const quiptEntrypoints = readdirSync(quiptEntrypointsDir, {
        withFileTypes: true,
    });
    const jsExtTest = /\.[jt]sx?$/;
    return quiptEntrypoints
        .filter((file) => file.isFile() && jsExtTest.test(file.name))
        .map(file => path.resolve( quiptEntrypointsDir, file.name));
}

