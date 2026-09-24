import { type JSX, ReactNode } from 'react';

import { RouteObject } from 'react-router';

import { Authentication } from 'quipt/features/authentication';
import stylesUrl from '../index.css?url';
import faviconUrl from '../../icons/quipt-icon.svg';

export const route = {
    path: 'auth/:formType',
} satisfies RouteObject;

export function Layout({ children }: { children: ReactNode }): JSX.Element {
    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="user-scalable=no, width=device-width, height=device-height, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0" />
                <meta name="apple-touch-fullscreen" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <link rel="icon" type="image/svg+xml" href={faviconUrl} />
                <link rel="stylesheet" href={stylesUrl} />
                <title>Quipt</title>

                <link rel="preconnect" href="https://rsms.me/" />
                <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
            </head>
            <body>
                <div className="text-foreground bg-background relative flex h-svh w-svw">
                    <div className="relative z-0 flex min-h-0 w-full flex-1">
                    { children }
                    </div>
                </div>
                <script type="module">
                    import "/@id/__x00__@vitejs/plugin-react/preamble";
                    import * as route from "/frontend/quipt/entrypoints/auth.js";
                    import main from "/frontend/quipt/main.js";
                    main(route);
                </script>
            </body>
        </html>
    );
}

export default Authentication;

