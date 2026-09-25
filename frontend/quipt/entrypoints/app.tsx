import { type JSX, type ReactNode } from 'react';

import { Outlet, isRouteErrorResponse, useRouteError } from 'react-router';

import { Head, Scripts } from 'quipt/components/ssr';
import { Root } from 'quipt/pages/Root';
import { App } from 'quipt/features/app';
import { defineEntry } from '../../shared/routing';

export default defineEntry({
    path: '',
    children: [
        { index: true, Component: Root },
        { path: 'test', element: <p>You are on the nested test page</p> },
        {
            id: 'xyz',
            path: 'deeply',
            Component: () => (
                <>
                    Deeply <Outlet />
                </>
            ),
            children: [
                {
                    id: 'zyx',
                    path: 'nested',
                    Component: () => (
                        <>
                            Nested <Outlet />
                        </>
                    ),
                    children: [{ path: 'route', element: <>Route</> }],
                },
            ],
        },
    ],
    Layout,
    Component: App,
    ErrorBoundary,
});

function Layout({ children }: { children: ReactNode }): JSX.Element {
    return (
        <html>
            <Head />
            <body>
                <div className="text-foreground bg-background relative flex h-svh w-svw">
                    {children}
                </div>
                <Scripts />
            </body>
        </html>
    );
}

function ErrorBoundary(): JSX.Element {
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
        return <div>Internal Error</div>;
    } else {
        return <h1>Unknown Error</h1>;
    }
}
