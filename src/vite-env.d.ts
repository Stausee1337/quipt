/// <reference types="vite/client" />

interface ViteTypeOptions {}

interface ImportMetaEnv {
    readonly VITE_API_HOST: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
