import { type JSX, type ComponentType, type ReactNode, createContext, useContext } from 'react';
import { Outlet, type LoaderFunction, type RouteObject } from 'react-router';

export type ExportedRouteEntry = {
    route: RouteObject;
    Layout: ComponentType<{ children: ReactNode }>;
    ErrorBoundary?: ComponentType | undefined;
    default: ComponentType;
};

export type RouteConfigEntry = {
    path: string;
    children?: RouteObject[] | undefined;
    loader?: LoaderFunction | undefined;
    Layout: ComponentType<{ children: ReactNode }>;
    Component?: ComponentType | undefined;
    ErrorBoundary?: ComponentType | undefined;
};

export type EntryMetaInfo = {
    id: string;
    module: string;
};

export type ServerEntryConfig = {
    clientEntryModule: string;
    meta: Record<string, EntryMetaInfo>;
    entries: Record<string, RouteConfigEntry>;
};

export function createRouterRoute({
    path,
    children,
    loader,
    Layout,
    Component,
    ErrorBoundary,
}: RouteConfigEntry): RouteObject {
    return {
        path,
        children,
        loader,
        element: Component ? (
            <Layout>
                <Component />
            </Layout>
        ) : (
            <Layout>
                <Outlet />
            </Layout>
        ),
        errorElement: ErrorBoundary ? (
            <Layout>
                <ErrorBoundary />
            </Layout>
        ) : undefined,
    };
}

export function defineEntry(entry: RouteConfigEntry): RouteConfigEntry {
    return entry;
}

const ServerConfigContextObj = createContext<ServerEntryConfig | null>(null);

export function useServerConfig(): ServerEntryConfig | undefined {
    return useContext(ServerConfigContextObj) ?? undefined;
}

export function ServerConfigProvider({
    config,
    children,
}: {
    config: ServerEntryConfig;
    children: ReactNode;
}): JSX.Element {
    return (
        <ServerConfigContextObj.Provider value={config}>{children}</ServerConfigContextObj.Provider>
    );
}
