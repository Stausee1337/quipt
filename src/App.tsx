import { JSX, onCleanup } from 'quipt/rexport';

import { Navigate, Route, Routes, BrowserRouter, useNavigate } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';

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
            <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col">
                {!breakpoints.md && <Header />}
                <div className="relative z-0 flex min-h-0 w-full flex-1">
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
                    <BrowserRouter>
                        <App>
                            <Routes>
                                <Route path="/" element={<Root/>} />
                                {!authenticationContext.isLoggedIn() ? (
                                    <>
                                        <Route path="/signin" element={<UserAuthenticate/>} />
                                        <Route path="/signup" element={<UserAuthenticate/>} />
                                    </>
                                ) : (
                                    <>
                                        <Route path="/new-script" element={<NewScriptRoute/>} />
                                        <Route path="/script/:uuid" element={<ScriptRoute/>} />
                                        <Route path="/script/:uuid/:division" element={<ScriptRoute/>} />
                                        <Route path="/train/:uuid/:division" element={<ScriptRoute/>} />
                                        <Route path="/dashboard" />
                                    </>
                                )}
                                <Route path="*paramName" element={<Navigate to="/" />}/>
                            </Routes>
                        </App>
                    </BrowserRouter>
                </AuthenticationContextObj.Provider>
            </QueryClientProvider>
        </ResponsiveBreakpointProivder>
    );
}
