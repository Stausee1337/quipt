import { JSX, createContext, createEffect, createResource, createSignal, useContext } from "solid-js";
import { runtime, createSimpleExecutor } from "qrpc-js"
import { AuthService, AuthSuccess, ScriptService, UserService } from "./schemas"
import { QueryClient } from "@tanstack/solid-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            experimental_prefetchInRender: true,
        },
    },
})

const apiURL = import.meta.env.VITE_API_HOST;
const qrpcURL = `${apiURL}/qrpc`;
const defaultExecutor = createSimpleExecutor(qrpcURL);

export const authService = new AuthService(defaultExecutor);

interface AuthorizedContext {
    ensureToken(): Promise<string>;
    refreshLogin(): Promise<void>;
}

function createAuthorizedExecutor(ctx: AuthorizedContext): runtime.Executor {
    return async (url: string, body: any): Promise<Response> => {
        const accessToken = await ctx.ensureToken();
        const headers = {
            'Authorization': `Bearer ${accessToken}`
        };
        let didRefresh = false;
        do {
            const response = await fetch(`${qrpcURL}${url}`, { method: "POST", body, headers });
            if (response.status === 401 && !didRefresh) {
                await ctx.refreshLogin()
                didRefresh = true;
                continue;
            } else if (response.status === 401 && didRefresh) {
                throw 'unexpected logout';
            }
            return response;
        } while (false);
        throw 'unreachable';
    }
}

export type FormattedString = Array<{ style: JSX.CSSProperties|null, string: string }>;

export interface OnLogoutLifecylce {
    subscribe(listener: () => void): () => void;
}

export interface AuthenticationContext {
    onLogout: OnLogoutLifecylce;
    services: { user: UserService, script: ScriptService }|undefined;
    logout(): void,
    isLoggedIn(): boolean;
    loginUser(data: AuthSuccess): any;
}

function createOnLogout(): OnLogoutLifecylce & { trigger(): void } {
    const listeners = new Set<() => void>();
    return {
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener)
        },
        trigger() {
            listeners.forEach(listener => listener())
        },
    };
}

export const AuthenticationContextObj = createContext<AuthenticationContext>();
export function createAuthenticationContext(): AuthenticationContext {
    const twoMinutes = 2 * 60 * 1000;

    const onLogout = createOnLogout();
    let [refreshToken, setRefreshToken] = (() => {
        let value = localStorage.getItem('refreshToken') ?? undefined;
        return [() => value, updater];

        function updater(token: string|undefined) {
            if (token === value) return;
            if (token === undefined)
                localStorage.removeItem('refreshToken');
            else
                localStorage.setItem('refreshToken', token)
            value = token;
        }
    })();

    function createServices() {
        const ctx: AuthorizedContext = {
         ensureToken() {
                 if (accessToken.loading) {
                     return new Promise<string>(resolve => {
                         createEffect(() => {
                             if (!accessToken.loading)
                                 resolve(accessToken());
                         })
                     })
                 }
                 return Promise.resolve(accessToken()!);
            },
            async refreshLogin() {
                await refetchAccessToken();
            }
        };
        const executor = createAuthorizedExecutor(ctx);
        const script = new ScriptService(executor);
        const user = new UserService(executor);
        return { script, user }
    }

    const [accessToken, { refetch: refetchAccessToken, mutate: mutateAccessToken }] =
        createResource<string|undefined>(async () => {
            const token = refreshToken();
            if (token === undefined)
                return undefined;
            const data = await authService.refresh({ refreshToken: token });
            if (!AuthSuccess.isSchema(data)) {
                logout();
                return;
            }
            setupAutomaticRefresh(data);
            setRefreshToken(data.refreshToken);
            return data.accessToken;
        });

    function setupAutomaticRefresh(data: AuthSuccess) {
        const tokenTTL = data.expiresAt - Date.now();
        setTimeout(refetchAccessToken, tokenTTL - twoMinutes);
    }

    function logout() {
        setIsLoggedIn(false);
        ctx.services = undefined; 
        setRefreshToken(undefined);
        onLogout.trigger();
    }

    const [isLoggedIn, setIsLoggedIn] = createSignal<boolean>(refreshToken() !== undefined);

    const ctx: AuthenticationContext = {
        onLogout,
        isLoggedIn,
        services: isLoggedIn() ? createServices() : undefined,
        logout() {
            const currentRefreshToken = refreshToken();
            if (currentRefreshToken !== undefined)
                authService.logout({ refreshToken: currentRefreshToken })
            logout();
        },
        loginUser(data) {
            if (isLoggedIn()) return;

            ctx.services = createServices();
            setIsLoggedIn(true);
            setRefreshToken(data.refreshToken);
            mutateAccessToken(data.accessToken);
            setupAutomaticRefresh(data);
        },
    };
    return ctx;
}

export function useAuthentication(): AuthenticationContext|undefined {
    const value = useContext(AuthenticationContextObj);
    if (value === null) {
        throw new Error('useAuthentication can only be used inside an AuthenticationContext');
    }
    return value;
}


