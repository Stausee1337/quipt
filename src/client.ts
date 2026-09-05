import { createContext, useState, useMemo, useContext } from 'quipt/rexport';

import { QueryClient, useQuery } from '@tanstack/react-query';
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
    defaultOptions: {
        queries: {
            staleTime: 2 * 60 * 60 * 1000
        },
    },
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
        console.log({ accessToken });
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
    isLoggedIn: boolean;
    loginUser(data: AuthSuccess): Promise<void>;
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

    const onLogout = useMemo(createOnLogout, []);
    const [refreshToken, setRefreshToken] = (() => {
        const [state, setState] = useState(
            localStorage.getItem('refreshToken') ?? undefined
        );
        return [state, updater];

        function updater(token: string | undefined) {
            if (token === state) return;
            if (token === undefined) localStorage.removeItem('refreshToken');
            else localStorage.setItem('refreshToken', token);
            setState(token);
        }
    })();

    function createServices() {
        const ctx: AuthorizedContext = {
            ensureToken() {
                return queryClient.query({ queryKey: ['accessToken'], staleTime: 'static' });
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

    const { refetch: refetchAccessToken } = useQuery({
        queryKey: ['accessToken'],
        async queryFn() {
            if (refreshToken === undefined) return null;
            let data;
            try {
                data = await authService.refresh({ refreshToken });
            } catch (e) {
                logout();
                // NOTE: Rethrow here so downstream code won't run. Especially executors, who might have called `refreshLogin()`
                throw e;
            }
            setupAutomaticRefresh(data);
            setRefreshToken(data.refreshToken);
            return data.accessToken;
        },
        staleTime: Infinity
    }, queryClient);


    function setupAutomaticRefresh(data: AuthSuccess) {
        const tokenTTL = data.expiresAt - Date.now();
        setTimeout(refetchAccessToken, tokenTTL - twoMinutes);
    }

    function logout() {
        queryClient.invalidateQueries({ queryKey: ['accessToken']});
        setRefreshToken(undefined);
        refetchAccessToken();
        onLogout.trigger();

        queryClient.resetQueries();
    }

    const isLoggedIn = refreshToken !== undefined;
    const services = useMemo(() => isLoggedIn ? createServices() : undefined, [isLoggedIn]);

    return {
        onLogout,
        isLoggedIn,
        services,
        logout() {
            if (refreshToken !== undefined)
                authService.logout({ refreshToken });
            logout();
        },
        async loginUser(data) {
            if (isLoggedIn) return;

            setRefreshToken(data.refreshToken);
            await queryClient.invalidateQueries({ queryKey: ['accessToken']});
            queryClient.setQueryData(['accessToken'], data.accessToken);
            setupAutomaticRefresh(data);
        },
    };
}

export function useAuthentication(): AuthenticationContext | undefined {
    const value = useContext(AuthenticationContextObj);
    if (value === null) {
        throw new Error('useAuthentication can only be used inside an AuthenticationContext');
    }
    return value;
}
