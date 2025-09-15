import { JSX } from "solid-js";
import { auth } from './protos';

type ResultPromise<T, E> = Promise<[T, undefined] | [undefined, E]>;

type Executor = (b: BodyInit | null) => Promise<{ status: number, data: Uint8Array }>;

const postRequests = {
    "/auth/signup":
        async (body: auth.ISignupRequest, executeWith: Executor): ResultPromise<auth.AuthSuccess, auth.AuthError> => {
            const writer = auth.SignupRequest.encode(body);
            const { status, data } = await executeWith(writer.finish().slice(0, writer.len));
            if (status !== 200)
                return [undefined, auth.AuthError.decode(data)];
            return [auth.AuthSuccess.decode(data), undefined];

        },
    "/auth/refresh": 
        async (body: string, executeWith: Executor): Promise<auth.AuthSuccess> => {
            const { status, data } = await executeWith(body);
            if (status === 200)
                return auth.AuthSuccess.decode(data);
            else if (status === 400)
                throw new ForceLogout()
            else
                throw 'unreachable'
        }
};

type PostRequests = typeof postRequests

const apiURL = "localhost:8000";

export class ForceLogout extends Error {}
export class APIError extends Error {}

export function post<K extends keyof PostRequests>(
    endpoint: K,
    bodyObject: Parameters<PostRequests[K]>[0]
): ReturnType<PostRequests[K]> {
    type Result = ReturnType<PostRequests[K]>;

    const fn = postRequests[endpoint];
    return fn(
        bodyObject,
        async (b: BodyInit | null): Promise<{ status: number, data: Uint8Array }> => {
            let didRefresh = false;
            do {
                const response = await fetch(`http://${apiURL}${endpoint}`, { method: "POST", body: b });
                if (response.ok)
                    return { status: response.status, data: new Uint8Array(await response.arrayBuffer()) }
                if (response.status === 401 && !didRefresh && endpoint !== "/auth/refresh") {
                    await refreshLogin()
                    didRefresh = true;
                    continue;
                }
                if (response.status >= 500) {
                    const message = await response.text();
                    throw new APIError(`Unexpected API response: ${message}`);
                }
                return { status: response.status, data: new Uint8Array(await response.arrayBuffer()) };
            } while (false);
            throw 'unreachable';
        }) as Result;
}

const refreshToken = "9232T5JNEfCMIeRU6F167Q.uKl/Vn5TbWEwj6PTQIsCv5TKBlJhwBOuoTe2ghD5jeY";
// refreshToken:

export async function refreshLogin(): Promise<void> {
    const data = await post("/auth/refresh", refreshToken);
    console.log(data)
}

// TODO: move somewhere else
export type FormattedString = Array<{ style: JSX.CSSProperties|null, string: string }>;

type Markdown = string;

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

