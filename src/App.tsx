import './App.scss'
import { createSignal, onCleanup, JSX, createEffect, createContext } from 'solid-js';
import { HeaderElement } from './components/HeaderElement';
import { MenuElement } from './components/MenuElement';
import { Router, Route, Navigate, useNavigate } from '@solidjs/router';
import { AuthenticationContextObj, createAuthenticationContext, useAuthentication } from './backend';
import { ScriptContextObj, createScriptContext } from './script';
import { UserAuthenticate } from './pages/UserAuthenticate';
import { Root } from './pages/Root';
import { NewScriptRoute, NoScriptRoute, ScriptRoute } from './pages/Script';


export const IsMobileContext = createContext<() => boolean>();

function App(props: { children: JSX.Element }): JSX.Element {
    const authenticationContext = useAuthentication()!;
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = createSignal(window.innerWidth <= 768);
    const scriptContext = createScriptContext(authenticationContext);

    const unsubscribe = authenticationContext.onLogout.subscribe(() => navigate('/signin'));
    onCleanup(() => {
        unsubscribe();
    });

    const mql = window.matchMedia("(max-width: 768px)");
    mql.addEventListener('change', () => {
        setIsMobile(window.innerWidth <= 768);
    });

    createEffect(() => {
        const root = document.querySelector('#root')!;
        if (!isMobile() && authenticationContext.isLoggedIn())
            root.classList.add('sidebar-visible');
        else
            root.classList.remove('sidebar-visible');
    })

    return (
        <IsMobileContext.Provider value={isMobile}>
            <ScriptContextObj.Provider value={scriptContext}>
                { 
                    isMobile() 
                        ? <HeaderElement/> 
                        : ( authenticationContext.isLoggedIn() && <MenuElement/> )
                }
                <div class="routing-contents">
                    {props.children}
                </div>
            </ScriptContextObj.Provider>
        </IsMobileContext.Provider>
    );
}

export default function() {
    const authenticationContext = createAuthenticationContext();
    return (
        <AuthenticationContextObj.Provider value={authenticationContext}>
            <Router root={App}>
                <Route path="/" component={Root}/>
                {
                    !authenticationContext.isLoggedIn()
                        ? <Route path={["/signin", "/signup"]} component={UserAuthenticate}/>
                        : (
                            <>
                                <Route path="/new-script" component={NewScriptRoute} />
                                <Route path="/no-script" component={NoScriptRoute} />
                                <Route path={["/script", "/script/:uuid", "/script/:uuid/:division"]} component={ScriptRoute} />
                            </>
                        )
                }
                <Route 
                    path="*paramName"
                    component={() => <Navigate href="/"/>}/>
            </Router>
        </AuthenticationContextObj.Provider>
    );
}


