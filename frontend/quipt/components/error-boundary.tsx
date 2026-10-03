import { type JSX } from 'react';

import { isRouteErrorResponse, useRouteError } from 'react-router';

export function ErrorBoundary(): JSX.Element {
    const error = useRouteError();

    let body;
    let title: string;
    if (isRouteErrorResponse(error)) {
        title = `Error ${error.status} (${error.statusText})!!!`
        body = (
            <div>
                <h1>
                    {error.status} {error.statusText}
                </h1>
                <p>{error.data}</p>
            </div>
        );
    } else if (error instanceof Error && import.meta.env.DEV) {
        title = `Error (${error.message})`
        body = (
            <div>
                <h1>Error</h1>
                <p>{error.message}</p>
                <p>The stack trace is:</p>
                <pre>{error.stack}</pre>
            </div>
        );
    } else if (error instanceof Error && !import.meta.env.DEV) {
        title = `Error (Internal Error)`
        body = <div>Internal Error</div>;
    } else {
        title = `Error (Unknown Error)`
        body = <h1>Unknown Error</h1>;
    }

    return (
        <>
            <title>{`${title}`}</title>
            { body }
        </>
    );
}
