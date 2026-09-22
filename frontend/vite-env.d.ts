/// <reference types="vite/client" />

interface ViteTypeOptions {}

interface ImportMetaEnv {
    readonly VITE_API_HOST: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module 'virtual:icons-meta' {
    export type IconData = {
        viewBox: string;
        width: number;
        height: number;
    };
    export type IconMeta = {
        fileName: string;
        iconData: Record<string, IconData>;
    };
    export const iconsMeta: IconMeta;
    export default iconsMeta;
}
