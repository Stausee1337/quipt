import { type JSX } from 'react';

import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

import { Head, Scripts } from 'quipt/components/ssr';
import { defineEntry } from '../../shared/routing';

export default defineEntry({
    path: '',
    Layout,
    ErrorBoundary,
});

function Layout(): JSX.Element {
    return (
        <html>
            <Head />
            <body>
                <div className="text-foreground bg-background relative flex h-svh w-svw">
                    <div className="p-1">
                        <h1 className="text-heading-1">TODO: Landing Page</h1>
                        <p>
                            <a href="/auth/signin?continue=http%3A%2F%2Flocalhost%3A5173%2Fapp&step=identify&index=0">
                                Login
                            </a>
                        </p>
                        <p>
                            <Link to="/signup">Register</Link>
                        </p>
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
