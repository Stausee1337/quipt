import { type JSX, type ReactNode } from 'react';

import { isRouteErrorResponse, useRouteError } from 'react-router';

import { Head, Scripts } from 'quipt/components/ssr';
import { Authentication } from 'quipt/features/auth';
import { defineEntry } from '../../shared/routing';

export default defineEntry({
    path: 'auth/:formType',
    Layout,
    ErrorBoundary,
    Component: Authentication,
});

function Layout({ children }: { children: ReactNode }): JSX.Element {
    return (
        <html>
            <Head />
            <body>
                <div className="text-foreground bg-background relative flex h-svh w-svw">
                    <div className="relative z-0 flex min-h-0 w-full flex-1 flex-wrap">
                        {children}
                    </div>
                </div>
                <Scripts />
            </body>
        </html>
    );
}

// TODO: factor out into components
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
