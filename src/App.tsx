import { JSX, onCleanup } from 'solid-js';

import { Navigate, Route, Router, useNavigate } from '@solidjs/router';
import { QueryClientProvider } from '@tanstack/solid-query';

import {
    AuthenticationContextObj,
    createAuthenticationContext,
    queryClient,
    useAuthentication,
} from 'quipt/client';
import { Header } from 'quipt/components/HeaderElement';
import { SideMenu } from 'quipt/components/MenuElement';
import { Root } from 'quipt/pages/Root';
import { NewScriptRoute, ScriptRoute } from 'quipt/pages/Script';
import { UserAuthenticate } from 'quipt/pages/UserAuthenticate';
import { ScriptContextObj, createScriptContext } from 'quipt/script';
import { ResponsiveBreakpointProivder, useBreakpoints } from 'quipt/responsive';

function App(props: { children?: JSX.Element }): JSX.Element {
    const authenticationContext = useAuthentication()!;
    const navigate = useNavigate();
    const scriptContext = createScriptContext(authenticationContext);
    const breakpoints = useBreakpoints();

    const unsubscribe = authenticationContext.onLogout.subscribe(() => navigate('/'));
    onCleanup(() => {
        unsubscribe();
    });

    return (
        <ScriptContextObj.Provider value={scriptContext}>
            <div class="relative z-0 flex min-h-0 w-full flex-1 flex-col">
                {!breakpoints.md && <Header />}
                <div class="relative z-0 flex min-h-0 w-full flex-1">
                    {breakpoints.md && authenticationContext.isLoggedIn() && <SideMenu />}
                    {props.children}
                </div>
            </div>
        </ScriptContextObj.Provider>
    );
}

export default function () {
    const authenticationContext = createAuthenticationContext();
    return (
        <ResponsiveBreakpointProivder>
            <QueryClientProvider client={queryClient}>
                <AuthenticationContextObj.Provider value={authenticationContext}>
                    <Router root={App}>
                        <Route path="/" component={Root} />
                        {!authenticationContext.isLoggedIn() ? (
                            <Route path={['/signin', '/signup']} component={UserAuthenticate} />
                        ) : (
                            <>
                                <Route path="/new-script" component={NewScriptRoute} />
                                <Route
                                    path={[
                                        '/script/:uuid',
                                        '/script/:uuid/:division',
                                        '/train/:uuid/:division',
                                    ]}
                                    component={ScriptRoute}
                                />
                                <Route path="/dashboard" />
                            </>
                        )}
                        <Route path="*paramName" component={() => <Navigate href="/" />} />
                    </Router>
                </AuthenticationContextObj.Provider>
            </QueryClientProvider>
        </ResponsiveBreakpointProivder>
    );
}
