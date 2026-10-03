import { type JSX, type ReactNode } from 'react';

import { App, Home } from 'quipt/features/app';
import { ErrorBoundary } from 'quipt/components/error-boundary';
import { Head, Scripts } from 'quipt/components/ssr';
import { Providers } from 'quipt/components/global-contexts';
import { defineEntry } from '../../shared/routing';

export default defineEntry({
    path: '/app',
    children: [
        { index: true, Component: Home },
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
                <Providers>
                    <div className="text-foreground bg-background relative flex h-svh w-svw">
                        {children}
                    </div>
                </Providers>
                <Scripts />
            </body>
        </html>
    );
}

