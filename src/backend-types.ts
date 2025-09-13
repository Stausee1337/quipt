import { JSX } from "solid-js";

export interface Requests {
    "/add-score": {
        divisionUuid: string,
        triggerId: number,
        score: number
    };
}

function x<K extends keyof(Requests)>(endpoint: K, body: Requests[K]) {

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

export { auth } from './protos';

