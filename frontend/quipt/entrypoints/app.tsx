import { type JSX, ReactNode } from 'react';

import { RouteObject, isRouteErrorResponse, useRouteError } from 'react-router';

import { App } from 'quipt/features/app';
import { Root } from 'quipt/pages/Root';
import stylesUrl from '../index.css?url';

export const route = {
    path: '',
    children: [
        { index: true, Component: Root },
        { path: 'test', element: <p>You are on the nested test page</p> }
    ]
} satisfies RouteObject;

export function Layout({ children }: { children: ReactNode }) {
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
                <link rel="icon" type="image/svg+xml" href="/quipt-icon.svg" />
                <link rel="stylesheet" href={stylesUrl} />
                <title>Quipt</title>

                <link rel="preconnect" href="https://rsms.me/" />
                <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
            </head>
            <body>
                <div className="text-foreground bg-background relative flex h-svh w-svw">
                    { children }
                </div>
                <script type="module">
                    import "/@id/__x00__@vitejs/plugin-react/preamble";
                    import * as route from "/frontend/quipt/entrypoints/app.js";
                    import main from "/frontend/quipt/main.js";
                    main(route);
                </script>
            </body>
        </html>
    );
}

export function ErrorBoundary(): JSX.Element {
  const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return (
            <div>
                <h1>
                    {error.status} {error.statusText}
                </h1>
                <p>{error.data}</p>
            </div>
        );
    } else if (error instanceof Error && import.meta.env.DEV) {
        return (
            <div>
                <h1>Error</h1>
                <p>{error.message}</p>
                <p>The stack trace is:</p>
                <pre>{error.stack}</pre>
            </div>
        );
    } else if (error instanceof Error && import.meta.env.DEV) {
        return (<div>Internal Error</div>);
    } else {
        return <h1>Unknown Error</h1>;
    }
}

export default App;

