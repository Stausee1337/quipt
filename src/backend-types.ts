import { JSX } from "solid-js";
import { auth } from './protos';

export interface PostRequests {
    "/auth/signup": {
        body: auth.ISignupRequest,
        success: auth.AuthSuccess,
        failiure: auth.AuthError,
    }
}

type ResultPromise<T, E> = Promise<[T, undefined] | [undefined, E]>;

const apiURL = "localhost:8000";

export async function post<K extends keyof(PostRequests)>(
    endpoint: K,
    bodyObject: PostRequests[K]['body']
): ResultPromise<PostRequests[K]['success'], PostRequests[K]['failiure']> {
    let data: Uint8Array, 
        successDecode: (buffer: Uint8Array) => PostRequests[K]['success'],
        failiureDecode: (buffer: Uint8Array) => PostRequests[K]['failiure'];
    switch (endpoint) {
        case "/auth/signup": {
            const writer = auth.SignupRequest.encode(bodyObject);
            data = writer.finish().slice(0, writer.len);
            console.log(data.byteLength, writer.len);
            successDecode = buffer => auth.AuthSuccess.decode(buffer)
            failiureDecode = buffer => auth.AuthError.decode(buffer)
        } break;
        default:
            throw '';
    }


    const response = await fetch(`http://${apiURL}${endpoint}`, { method: "POST", body: data.buffer });
    const buffer = await response.arrayBuffer();

    if (response.ok) {
        return [successDecode(new Uint8Array(buffer)), undefined];
    }

    if (response.status >= 500) {
        throw `post '${endpoint}' failed with status code ${response.status}`;
    }

    return [undefined, failiureDecode(new Uint8Array(buffer))];
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

