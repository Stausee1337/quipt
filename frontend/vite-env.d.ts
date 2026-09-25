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

declare module '*.html' {
    const data: string;
    export default data;
}

declare module 'virtual:custom-ssr/server-entry-config' {
    export const clientEntryModule: string;
    export const meta: Record<string, EntryMetaInfo>;
    export const entries: Record<string, RouteConfigEntry>;
}
