/// <reference types="vite/client" />

interface ViteTypeOptions {}

interface ImportMetaEnv {
    readonly VITE_API_HOST: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module 'virtual:icons-meta' {
    export type IconMeta = {
        viewBox: string;
        width: number;
        height: number;
    };
    export const iconsMeta: Record<string, IconMeta>;
    export default iconsMeta;
}
