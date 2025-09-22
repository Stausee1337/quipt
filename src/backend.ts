import { JSX, createContext, createEffect, createResource, createSignal, useContext, ResourceReturn, Resource } from "solid-js";
import { auth, scripts } from './protos';

type ResultPromise<T, E> = Promise<[T, undefined] | [undefined, E]>;

type Executor = (b: BodyInit | null, endpointOverride?: string) => Promise<{ status: number, data: Uint8Array }>;

type RemovePromise<T> = T extends Promise<infer U> ? U : T;

const defaultPostRequests = {
    "/auth/signin":
        async (body: auth.ISigninRequest, executeWith: Executor): ResultPromise<auth.AuthSuccess, auth.AuthError> => {
            const writer = auth.SigninRequest.encode(body);
            const { status, data } = await executeWith(writer.finish().slice(0, writer.len));
            if (status !== 200)
                return [undefined, auth.AuthError.decode(data)];
            return [auth.AuthSuccess.decode(data), undefined];

        },
    "/auth/signup":
        async (body: auth.ISignupRequest, executeWith: Executor): ResultPromise<auth.AuthSuccess, auth.AuthError> => {
            const writer = auth.SignupRequest.encode(body);
            const { status, data } = await executeWith(writer.finish().slice(0, writer.len));
            if (status !== 200)
                return [undefined, auth.AuthError.decode(data)];
            return [auth.AuthSuccess.decode(data), undefined];

        },
    "/auth/refresh": 
        async (body: string, executeWith: Executor): Promise<auth.AuthSuccess|undefined> => {
            const { status, data } = await executeWith(body);
            if (status === 200)
                return auth.AuthSuccess.decode(data);
            else if (status === 400)
                return undefined;
            else
                throw 'unreachable'
        },
    "/auth/expire": 
        async (body: string, executeWith: Executor): Promise<void> => {
            const { status } = await executeWith(body);
            if (status === 204)
                return;
            else
                throw 'unreachable'
        }
};

const apiURL = import.meta.env.VITE_API_HOST;

export class APIError extends Error {}
export class UnexpectedLogout extends Error {}

abstract class BaseRequestProvider<
    GetRequests extends Record<string, (e: Executor) => any>,
    ParametrizedGetRequests extends Record<string, (parameter: string, e: Executor) => any>,
    PostRequests extends Record<string, (args: any, e: Executor) => any>
> {
    constructor(
        private getRequests: GetRequests,
        private parametrizedGetRequests: ParametrizedGetRequests,
        private postRequests: PostRequests
    ) { }

    get<K extends keyof GetRequests>(endpoint: K): ReturnType<GetRequests[K]> {
        type Result = ReturnType<GetRequests[K]>;

        const fn = this.getRequests[endpoint];
        return fn(this.executorFactory("GET", endpoint)) as Result;
    }

    getParametrized<K extends keyof ParametrizedGetRequests>(endpoint: K, parameter: string): ReturnType<ParametrizedGetRequests[K]> {
        type Result = ReturnType<ParametrizedGetRequests[K]>;

        const fn = this.parametrizedGetRequests[endpoint];
        return fn(parameter, this.executorFactory("GET", endpoint)) as Result;
    }

    post<K extends keyof PostRequests>(
        endpoint: K, bodyObject: Parameters<PostRequests[K]>[0]): ReturnType<PostRequests[K]> {
        type Result = ReturnType<PostRequests[K]>;

        const fn = this.postRequests[endpoint];
        return fn(bodyObject, this.executorFactory("POST", endpoint)) as Result;
    }

    abstract executorFactory(method: string, endpoint: string): Executor;
}

abstract class CachableRequestsProvider<
    GetRequests extends Record<string, (e: Executor) => any>,
    ParametrizedGetRequests extends Record<string, (parameter: string, e: Executor) => any>,
    PostRequests extends Record<string, (args: any, e: Executor) => any>
> extends BaseRequestProvider<GetRequests, ParametrizedGetRequests, PostRequests> {

    caches: Map<keyof GetRequests, ResourceReturn<any>> = new Map();
    constructor(
        getRequests: GetRequests,
        parametrizedGetRequests: ParametrizedGetRequests,
        postRequests: PostRequests,
    ) {
        super(getRequests, parametrizedGetRequests, postRequests);
    }

    getCached<K extends keyof GetRequests>(endpoint: K): ResourceReturn<RemovePromise<ReturnType<GetRequests[K]>>> {
        let cache = this.caches.get(endpoint);
        if (cache !== undefined)
            return cache
        cache = createResource(() => this.get(endpoint));
        this.caches.set(endpoint, cache);
        return cache;
    }

}

export class DefaultRequestsProvider extends BaseRequestProvider<{}, {}, typeof defaultPostRequests> {
    constructor() {
        super({}, {}, defaultPostRequests);
    }

    executorFactory(method: string, endpoint: string): Executor {
        return async (b: BodyInit | null): Promise<{ status: number, data: Uint8Array }> => {
            const response = await fetch(`${apiURL}${endpoint}`, { method, body: b });
            if (response.ok)
                return { status: response.status, data: new Uint8Array(await response.arrayBuffer()) }
            if (response.status >= 500) {
                const message = await response.text();
                throw new APIError(`Unexpected API response: ${message}`);
            }
            return { status: response.status, data: new Uint8Array(await response.arrayBuffer()) };
        };
    }
}

export const defaultRequests = new DefaultRequestsProvider();

const authenticatedGetRequests = {
    "/get-user": async (executor: Executor): Promise<auth.User> => {
        const { status, data } = await executor(null);
        if (status === 200)
            return auth.User.decode(data);
        throw 'unreachable';
    },
    "/list-scripts": async (executor: Executor): Promise<scripts.IScript[]> => {
        const { status, data } = await executor(null);
        if (status !== 200)
            throw 'unreachable';
        const scriptsResp = scripts.Scripts.decode(data);
        return scriptsResp.scripts;
    },
};

const authenticatedParametrizedGetRequests = {
    "/script": async (scriptId: string, executor: Executor): ResultPromise<scripts.Script, scripts.ScriptError> => {
        const { status, data } = await executor(null, `/script/${scriptId}`);
        if (status === 200)
            return [scripts.Script.decode(data), undefined];
        else if (status === 400)
            return [undefined, scripts.ScriptError.decode(data)];
        else
            throw 'unreachable';
    },
};

const authenticatedPostRequests = {
    "/commit-scores": 
        async (body: scripts.IDivisionScoreUpdate, executor: Executor): Promise<scripts.ScriptError|undefined> => {
            const writer = scripts.DivisionScoreUpdate.encode(body);
            const { status, data } = await executor(writer.finish().slice(0, writer.len));
            if (status === 204)
                return undefined
            else if (status === 400)
                return scripts.ScriptError.decode(data);
            else
                throw 'unreachable';
        },
};

export class AuthenticatedRequestsProvider extends CachableRequestsProvider<
    typeof authenticatedGetRequests,
    typeof authenticatedParametrizedGetRequests,
    typeof authenticatedPostRequests> {
    constructor(
        private getAccessToken: Resource<string|undefined>,
        private refreshLogin: () => Promise<void>,
    ) {
        super(authenticatedGetRequests, authenticatedParametrizedGetRequests, authenticatedPostRequests);
    }

    get loading(): boolean {
        return this.getAccessToken.loading;
    }

    get accessToken(): string {
        return this.getAccessToken()!;
    }

    waitForTokenLoad(): Promise<void> {
        if (this.getAccessToken.loading) {
            return new Promise(resolve => {
                createEffect(() => {
                    if (!this.getAccessToken.loading)
                        resolve();
                })
            })
        }
        return Promise.resolve();
    }

    executorFactory(method: string, endpoint: string): Executor {
        return async (b: BodyInit | null, endpointOverride): Promise<{ status: number, data: Uint8Array }> => {
            await this.waitForTokenLoad();
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`
            };
            let didRefresh = false;
            endpoint = endpointOverride ?? endpoint;
            do {
                const response = await fetch(`${apiURL}${endpoint}`, { method, body: b, headers });
                if (response.ok)
                    return { status: response.status, data: new Uint8Array(await response.arrayBuffer()) }
                if (response.status === 401 && !didRefresh) {
                    await this.refreshLogin()
                    didRefresh = true;
                    continue;
                } else if (response.status === 401 && didRefresh) {
                    throw new UnexpectedLogout();
                }
                if (response.status >= 500) {
                    const message = await response.text();
                    throw new APIError(`Unexpected API response: ${message}`);
                }
                return { status: response.status, data: new Uint8Array(await response.arrayBuffer()) };
            } while (false);
            throw 'unreachable';
        }
    }
}

export type FormattedString = Array<{ style: JSX.CSSProperties|null, string: string }>;

type Markdown = string;

export interface OnLogoutLifecylce {
    subscribe(listener: () => void): () => void;
}

export interface AuthenticationContext {
    onLogout: OnLogoutLifecylce;
    requests: AuthenticatedRequestsProvider|undefined;
    logout(): void,
    isLoggedIn(): boolean;
    loginUser(data: auth.AuthSuccess): any;
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

    function createRequests() {
        return new AuthenticatedRequestsProvider(
            accessToken,
            async () => { await refetchAccessToken() });
    }

    const [accessToken, { refetch: refetchAccessToken, mutate: mutateAccessToken }] =
        createResource<string|undefined>(async () => {
            const token = refreshToken();
            if (token === undefined)
                return undefined;
            const data = await defaultRequests.post("/auth/refresh", token);
            if (data === undefined) {
                logout();
                return;
            }
            setupAutomaticRefresh(data);
            setRefreshToken(data.refreshToken);
            return data.accessToken;
        });

    function setupAutomaticRefresh(data: auth.AuthSuccess) {
        const tokenTTL = data.expiresAt - Date.now();
        setTimeout(refetchAccessToken, tokenTTL - twoMinutes);
    }

    function logout() {
        setIsLoggedIn(false);
        ctx.requests = undefined; 
        setRefreshToken(undefined);
        onLogout.trigger();
    }

    const [isLoggedIn, setIsLoggedIn] = createSignal<boolean>(refreshToken() !== undefined);

    const ctx: AuthenticationContext = {
        onLogout,
        isLoggedIn,
        requests: isLoggedIn() ? createRequests() : undefined,
        logout() {
            const currentRefreshToken = refreshToken();
            if (currentRefreshToken !== undefined)
                defaultRequests.post("/auth/expire", currentRefreshToken);
            logout();
        },
        loginUser(data) {
            if (isLoggedIn()) return;

            ctx.requests = createRequests();
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

export type Script = {
    uuid: string,
    name: string,
    divisions: Division[]
};

export type Division = {
    name: string,
    description: string,
    previousTotals: number[],
    textCues: TextCuePair[]
};

export type TextCuePair = {
    request: TextCue|null,
    response: TextCue,
    previousScores: number[]
};

export type TextCue = {
    actors: string[], text: Markdown
};

export { auth } from './protos';

