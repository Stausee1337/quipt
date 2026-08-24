import './App.scss'
import { createSignal, onCleanup, JSX, onMount } from 'solid-js';
import { HeaderElement } from './components/HeaderElement';
import { MenuElement } from './components/MenuElement';
import { Router, Route, Navigate, useNavigate } from '@solidjs/router';
import { QueryClientProvider } from '@tanstack/solid-query';
import { AuthenticationContextObj, queryClient, createAuthenticationContext, useAuthentication } from './client';
import { ScriptContextObj, createScriptContext } from './script';
import { UserAuthenticate } from './pages/UserAuthenticate';
import { Root } from './pages/Root';
import { NewScriptRoute, ScriptRoute } from './pages/Script';


function App(props: { children?: JSX.Element }): JSX.Element {
    const authenticationContext = useAuthentication()!;
    const navigate = useNavigate();
    const scriptContext = createScriptContext(authenticationContext);

    const unsubscribe = authenticationContext.onLogout.subscribe(() => navigate('/'));
    onCleanup(() => {
        unsubscribe();
    });

    // TODO: provide media query result via a context
    const query = window.matchMedia('(width < 768px)');
    const [isSmallWidth, setIsSmallWidth] = createSignal(query.matches);
    onMount(() => {
        query.addEventListener('change', () => {
            setIsSmallWidth(query.matches)
        })
    })

    return (
        <ScriptContextObj.Provider value={scriptContext}>
            { isSmallWidth() && <HeaderElement/> }
            { (!isSmallWidth() && authenticationContext.isLoggedIn()) && <MenuElement/> }
            <div class="routing-contents">
                {props.children}
            </div>
        </ScriptContextObj.Provider>
    );
}

export default function() {
    const authenticationContext = createAuthenticationContext();
    return (
        <QueryClientProvider client={queryClient}>
        <AuthenticationContextObj.Provider value={authenticationContext}>
            <Router root={App}>
                <Route path="/" component={Root}/>
                {
                    !authenticationContext.isLoggedIn()
                        ? <Route path={["/signin", "/signup"]} component={UserAuthenticate}/>
                        : (
                            <>
                                <Route path="/new-script" component={NewScriptRoute} />
                                <Route path={[
                                        "/script/:uuid",
                                        "/script/:uuid/:division",
                                        "/train/:uuid/:division",
                                    ]} 
                                    component={ScriptRoute}/>
                                <Route path="/dashboard"/>
                            </>
                        )
                }
                <Route
                    path="*paramName"
                    component={() => <Navigate href="/"/>}/>
            </Router>
        </AuthenticationContextObj.Provider>
        </QueryClientProvider>
    );
}


