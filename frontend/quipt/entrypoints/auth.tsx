import { type JSX, type ReactNode } from 'react';

import { type LoaderFunctionArgs, UNSAFE_ErrorResponseImpl } from 'react-router';

import { Head, Scripts } from 'quipt/components/ssr';
import { ErrorBoundary } from 'quipt/components/error-boundary';
import { Providers } from 'quipt/components/global-contexts';
import flows from 'quipt/features/auth';
import { defineEntry } from '../../shared/routing';

export default defineEntry({
    path: 'auth',
    Layout,
    ErrorBoundary,
    children: [
        { index: true, loader: notARealUrl },
        flows
    ],
});

function notARealUrl(args: LoaderFunctionArgs) {
    throw new UNSAFE_ErrorResponseImpl(
        404, 'Not Found', new Error(`No route matches URL "${args.url.pathname}"`)
    )
}

function Layout({ children }: { children: ReactNode }): JSX.Element {
    return (
        <html>
            <Head />
            <body>
                <Providers>
                    <div className="text-foreground bg-background relative flex h-svh w-svw">
                        <div className="relative z-0 flex min-h-0 w-full flex-1 flex-wrap">
                            {children}
                        </div>
                    </div>
                </Providers>
                <Scripts />
            </body>
        </html>
    );
}

