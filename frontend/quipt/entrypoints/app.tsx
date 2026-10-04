import { type JSX, type ReactNode, useState } from 'react';

import { App } from 'quipt/features/app';
import { ErrorBoundary } from 'quipt/components/error-boundary';
import { HydrationBoundary } from 'quipt/components/hydration-boundary';
import { Head, Scripts } from 'quipt/components/ssr';
import { Providers } from 'quipt/components/global-contexts';
import { defineEntry } from '../../shared/routing';

export default defineEntry({
    path: '/app/*',
    Layout,
    Component: App,
    ErrorBoundary,
});

function Layout({ children }: { children: ReactNode }): JSX.Element {
    const [title, _setTitle] = useState('Quipt');
    return (
        <html>
            <Head />
            <body>
                <Providers>
                    <title>{ title }</title>
                    <div className="text-foreground bg-background relative flex h-svh w-svw">
                        <HydrationBoundary>
                            {children}
                        </HydrationBoundary>
                    </div>
                </Providers>
                <Scripts />
            </body>
        </html>
    );
}

