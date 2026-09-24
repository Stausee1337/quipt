import type { ComponentType, ReactNode } from 'react';
import type { RouteObject } from 'react-router';

export type EntryRouteExport = {
    route: RouteObject,
    Layout: ComponentType<{ children: ReactNode }>,
    ErrorBoundary?: ComponentType | undefined,
    default: ComponentType
};

export function makeRoute({ route, Layout, ErrorBoundary, default: Component }: EntryRouteExport): RouteObject {
    return {
            ...route,
            element: <Layout><Component/></Layout>,
            errorElement: ErrorBoundary ? <Layout><ErrorBoundary/></Layout> : undefined
    };
}

