import { type JSX } from 'react';

import { RouterProvider, createBrowserRouter, useMatches } from 'react-router';

import stylesUrl from '../index.css?url';
import faviconUrl from '../../icons/quipt-icon.svg?url&no-inline';
import { RouteConfigEntry, createRouterRoute, useServerConfig } from '../../shared/routing';

export function Head(): JSX.Element {
    return (
        <head>
            <meta charSet="utf-8" />
            <meta
                name="viewport"
                content="user-scalable=no, width=device-width, height=device-height, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"
            />
            <meta name="apple-touch-fullscreen" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <link rel="icon" type="image/svg+xml" href={faviconUrl} />
            <link rel="stylesheet" href={stylesUrl} />
            <title>Quipt</title>
            <link rel="preconnect" href="https://rsms.me/" />
            <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        </head>
    );
}

export type HydrationEntryArgs = {
    id: string;
    entry: RouteConfigEntry;
};

export function Scripts(): JSX.Element | null {
    const matches = useMatches();
    const serverConfig = useServerConfig();

    if (typeof window !== 'undefined' || serverConfig === undefined) return null;

    const routeId = matches[0].id;

    const scriptData = `${
        import.meta.env.DEV ? 'import "/@id/__x00__@vitejs/plugin-react/preamble"' : ''
    };
import entry from ${JSON.stringify(serverConfig.meta[routeId].module)};
import bootstrap from ${JSON.stringify(serverConfig.clientEntryModule)};
bootstrap({id: ${JSON.stringify(routeId)},entry});`;

    return (
        <script
            type="module"
            async
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: scriptData }}
        />
    );
}

export function HydratingRouter({ args }: { args: HydrationEntryArgs }): JSX.Element {
    const routes = [{ id: args.id, ...createRouterRoute(args.entry) }];
    const router = createBrowserRouter(routes);

    return <RouterProvider router={router} />;
}
