import { type JSX, type ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { AuthenticationContextObj, createAuthenticationContext, queryClient } from 'quipt/client';
import { ResponsiveBreakpointProivder } from 'quipt/responsive';

export function Providers({ children }: { children: ReactNode }): JSX.Element {
    const authenticationContext = createAuthenticationContext();
    return (
        <ResponsiveBreakpointProivder>
            <QueryClientProvider client={queryClient}>
                <AuthenticationContextObj.Provider value={authenticationContext}>
                    {children}
                </AuthenticationContextObj.Provider>
            </QueryClientProvider>
        </ResponsiveBreakpointProivder>
    );
}
