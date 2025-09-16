import { Accessor, JSX, createContext, createEffect, createResource, createSignal, useContext } from "solid-js";
import { auth } from './protos';

type ResultPromise<T, E> = Promise<[T, undefined] | [undefined, E]>;

type Executor = (b: BodyInit | null) => Promise<{ status: number, data: Uint8Array }>;

const defaultPostRequests = {
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
        }
};

const apiURL = "localhost:8000";

export class APIError extends Error {}
export class UnexpectedLogout extends Error {}

abstract class BaseRequestProvider<
    GetRequests extends Record<string, (...args: any) => any>,
    PostRequests extends Record<string, (args: any, e: Executor) => any>
> {
    constructor(
        private getRequests: GetRequests,
        private postRequests: PostRequests
    ) { }

    get<K extends keyof GetRequests>(endpoint: K): ReturnType<GetRequests[K]> {
        type Result = ReturnType<GetRequests[K]>;

        const fn = this.getRequests[endpoint];
        return fn(this.executorFactory("GET", endpoint)) as Result;
    }

    post<K extends keyof PostRequests>(
        endpoint: K, bodyObject: Parameters<PostRequests[K]>[0]): ReturnType<PostRequests[K]> {
        type Result = ReturnType<PostRequests[K]>;

        const fn = this.postRequests[endpoint];
        return fn(bodyObject, this.executorFactory("POST", endpoint)) as Result;
    }

    abstract executorFactory(method: string, endpoint: string): Executor;
}

export class DefaultRequestsProvider extends BaseRequestProvider<{}, typeof defaultPostRequests> {
    constructor() {
        super({}, defaultPostRequests);
    }

    executorFactory(method: string, endpoint: string): Executor {
        return async (b: BodyInit | null): Promise<{ status: number, data: Uint8Array }> => {
            const response = await fetch(`http://${apiURL}${endpoint}`, { method, body: b });
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
    "/user": async (executor: Executor): Promise<auth.User|undefined> => {
        const { status, data } = await executor(null);
        if (status === 200)
            return auth.User.decode(data);
        throw 'unreachable';
    }
};

export class AuthenticatedRequestsProvider extends BaseRequestProvider<typeof authenticatedGetRequests, {}> {
    constructor(
        private getAccessToken: Accessor<string|undefined>,
        private refreshLogin: () => Promise<void>,
    ) {
        super(authenticatedGetRequests, {});
    }

    get accessToken(): string {
        return this.getAccessToken()!;
    }

    executorFactory(method: string, endpoint: string): Executor {
        return async (b: BodyInit | null): Promise<{ status: number, data: Uint8Array }> => {
            const headers = {
                'Authorization': `Baerar ${this.accessToken}`
            };
            let didRefresh = false;
            do {
                const response = await fetch(`http://${apiURL}${endpoint}`, { method, body: b, headers });
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

const refreshToken = "9232T5JNEfCMIeRU6F167Q.uKl/Vn5TbWEwj6PTQIsCv5TKBlJhwBOuoTe2ghD5jeY";
// refreshToken:


// TODO: move somewhere else
export type FormattedString = Array<{ style: JSX.CSSProperties|null, string: string }>;

type Markdown = string;

export interface OnLogoutLifecylce {
    subscribe(listener: () => void): () => void;
}

export interface AuthenticationContext {
    onLogout: OnLogoutLifecylce;
    requests: AuthenticatedRequestsProvider|undefined;
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
            return data.accessToken;
        });

    function setupAutomaticRefresh(data: auth.AuthSuccess) {
        const tokenTTL = data.expiresAt - Date.now();
        setTimeout(refetchAccessToken, tokenTTL - twoMinutes);
    }

    function logout() {
        setIsLoggedIn(false);
        setRefreshToken(undefined);
        onLogout.trigger();
    }

    const [isLoggedIn, setIsLoggedIn] = createSignal<boolean>(refreshToken() !== undefined);

    createEffect(() => {
        if (isLoggedIn())
            ctx.requests = createRequests();
        else
            ctx.requests = undefined; 
    });

    const ctx: AuthenticationContext = {
        onLogout,
        isLoggedIn,
        requests: isLoggedIn() ? createRequests() : undefined,
        loginUser(data) {
            if (isLoggedIn()) return;

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

export type Script = Readonly<{
    uuid: string,
    name: string,
    divisions: Division[]
}>;

export type Division = Readonly<{
    name: string|null,
    previousTotals: number[],
    textCues: TextCuePair[]
}>;

export type TextCuePair = Readonly<{
    request: TextCue|null,
    response: TextCue,
    previousScores: number[]
}>;

export type TextCue = Readonly<{
    actor: string|null, text: Markdown
}>;

// export { auth } from './protos';

