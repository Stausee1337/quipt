import { createContext, useEffect, useState, useMemo, useContext } from 'quipt/rexport';

import { QueryClient } from '@tanstack/react-query';
import { createSimpleExecutor, runtime } from 'qrpc-js';

import {
    AuthService,
    AuthSuccess,
    CueService,
    DivisionService,
    ScriptService,
    UserService,
} from 'quipt/schemas';

export const queryClient = new QueryClient({
    // defaultOptions: {
    //     queries: {
    //         experimental_prefetchInRender: true,
    //     },
    // },
});

const apiURL = import.meta.env.VITE_API_HOST;
const qrpcURL = `${apiURL}/qrpc`;

const defaultExecutor = createSimpleExecutor(qrpcURL);

export const authService = new AuthService(defaultExecutor);

interface AuthorizedContext {
    ensureToken(): Promise<string>;
    refreshLogin(): Promise<void>;
}

function createAuthorizedExecutor(ctx: AuthorizedContext): runtime.Executor {
    return async (url: string, body: string): Promise<Response> => {
        const accessToken = await ctx.ensureToken();
        const headers = {
            Authorization: `Bearer ${accessToken}`,
        };
        let didRefresh = false;
        do {
            const response = await fetch(`${qrpcURL}${url}`, {
                method: 'POST',
                body,
                headers,
            });
            if (response.status === 401 && !didRefresh) {
                await ctx.refreshLogin();
                didRefresh = true;
                continue;
            } else if (response.status === 401 && didRefresh) {
                throw 'unexpected logout';
            }
            return response;
        } while (false);
        throw 'unreachable';
    };
}

export interface OnLogoutLifecylce {
    subscribe(listener: () => void): () => void;
}

type AuthenticatedServices = {
    user: UserService;
    script: ScriptService;
    division: DivisionService;
    cue: CueService;
};

export interface AuthenticationContext {
    onLogout: OnLogoutLifecylce;
    services: AuthenticatedServices | undefined;
    logout(): void;
    isLoggedIn(): boolean;
    loginUser(data: AuthSuccess): any;
}

function createOnLogout(): OnLogoutLifecylce & { trigger(): void } {
    const listeners = new Set<() => void>();
    return {
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        trigger() {
            listeners.forEach(listener => listener());
        },
    };
}

export const AuthenticationContextObj = createContext<AuthenticationContext|undefined>(undefined);
export function createAuthenticationContext(): AuthenticationContext {
    const twoMinutes = 2 * 60 * 1000;

    const onLogout = createOnLogout();
    let [refreshToken, setRefreshToken] = (() => {
        let value = localStorage.getItem('refreshToken') ?? undefined;
        return [() => value, updater];

        function updater(token: string | undefined) {
            if (token === value) return;
            if (token === undefined) localStorage.removeItem('refreshToken');
            else localStorage.setItem('refreshToken', token);
            value = token;
        }
    })();

    function createServices() {
        const ctx: AuthorizedContext = {
            ensureToken() {
                if (accessToken.loading || accessToken() === undefined) {
                    return new Promise<string>(resolve => {
                        useEffect(() => {
                            if (!accessToken.loading && accessToken() !== undefined)
                                resolve(accessToken());
                        });
                    });
                }
                return Promise.resolve(accessToken()!);
            },
            async refreshLogin() {
                await refetchAccessToken();
            },
        };
        const executor = createAuthorizedExecutor(ctx);
        const script = new ScriptService(executor);
        const division = new DivisionService(executor);
        const cue = new CueService(executor);
        const user = new UserService(executor);
        return {
            script,
            user,
            division,
            cue,
        };
    }

    const [accessToken, { refetch: refetchAccessToken, mutate: mutateAccessToken }] =
        createResource<string | undefined>(async () => {
            const token = refreshToken();
            if (token === undefined) return undefined;
            let data;
            try {
                data = await authService.refresh({ refreshToken: token });
            } catch (e) {
                logout();
                // NOTE: Rethrow here so downstream code won't run. Especially executors, who might have called `refreshLogin()`
                throw e;
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
        mutateAccessToken(undefined);
        onLogout.trigger();

        queryClient.resetQueries();
    }

    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(refreshToken() !== undefined);
    const services = useMemo(() => isLoggedIn ? createServices() : undefined, [isLoggedIn]);

    const ctx: AuthenticationContext = {
        onLogout,
        isLoggedIn: () => isLoggedIn,
        services,
        logout() {
            const currentRefreshToken = refreshToken();
            if (currentRefreshToken !== undefined)
                authService.logout({ refreshToken: currentRefreshToken });
            logout();
        },
        loginUser(data) {
            if (isLoggedIn) return;

            ctx.services = createServices();
            setIsLoggedIn(true);
            setRefreshToken(data.refreshToken);
            mutateAccessToken(data.accessToken);
            setupAutomaticRefresh(data);
        },
    };
    return ctx;
}

export function useAuthentication(): AuthenticationContext | undefined {
    const value = useContext(AuthenticationContextObj);
    if (value === null) {
        throw new Error('useAuthentication can only be used inside an AuthenticationContext');
    }
    return value;
}
