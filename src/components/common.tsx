import { Accessor, JSX, createMemo, createSignal, untrack } from "solid-js";
import { Lexer, MarkedToken } from 'marked';
import { Division, Script, TextCue } from "../schemas";
import { decode } from 'html-entities';

export const progressBarGreen = '#5d9948';
export const progressBarYellow = '#fad541';
export const progressBarOrange = '#ffa459';
export const progressBarRed = '#fa742c';

export type FormattedStringElement = { style: JSX.CSSProperties|null, string: string };
export type FormattedString = FormattedStringElement[];

export function formatString(string: FormattedString): JSX.Element {
    const result: JSX.ArrayElement = [];

    for (let item of string) {
        if (item.style === null) {
            result.push(decode(item.string));
        } else {
            result.push(<span style={item.style}>{ decode(item.string) }</span>);
        }
    }

    return result;
}

// function generateSunflowerColor(idx: number, saturation = 95, value = 70): string {
//     const PHI = (5 ** 0.5 + 1) * 0.5;
// 	return `hsl(${((PHI * idx) % 1) * 360}deg, ${saturation}%, ${value}%)`;
// }

function generateColor(idx: number, saturation = 85, value = 90): string {
    const PHI = (5 ** 0.5 + 1) * 0.5;
	return `lch(${value}% ${saturation}% ${((PHI * idx) % 1) * 360}deg)`;
}

function fnv1aHash(str: string): number {
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0; // FNV prime
    }
    return hash >>> 0;
}

export function getActorColor(actor: string): string {
    return generateColor(fnv1aHash(actor) & 0x7f);
}

export function formatActorsArray(actors: string[]|null): FormattedString|null {
    if (actors === null)
        return null;
    if (actors.length === 0)
        return null;

    const result: FormattedString = actors
        .map(actor => [getActorColor(actor), actor])
        .map(item => ({ style: { color: item[0] }, string: item[1] }));

    if (result.length === 1) {
        return result;
    }

    for (let i = 0; i < Math.floor(result.length / 2); i++) {
        const index = (i*2)+1;
        result.splice(index, 0, {
            style: null,
            string: (index === result.length-1) ? " und " : ", "
        });
    }

    return result;
}

const lighter2 = "rgb(167.4375, 167.4375, 167.4375)" ;

export function formatMarkdown(markdown: string): FormattedString { 
    function* mapToken(tokens: MarkedToken[], style: JSX.CSSProperties|null = null): Generator<FormattedStringElement> {
        for (const token of tokens) {
            switch (token.type) {
                case 'text':
                    yield { style, string: token.text };
                    break;
                case 'em':
                    yield* mapToken(token.tokens as MarkedToken[], { ...style, 'font-style': 'italic', 'color': lighter2 });
                    break;
                case 'strong':
                    yield* mapToken(token.tokens as MarkedToken[], { ...style, 'font-weight': 'bold' });
                    break;
                default:
                    console.error('default markdown', token);
                    yield { style, string: token.raw };
                    break;
            }
        }
    }

    const tokens = Lexer.lexInline(markdown) as MarkedToken[];
    return Array.from(mapToken(tokens));
}

export interface CueContainerInfo {
    actors: string[];
    textCues: number;
}

function commonElements<T>(arrays: T[][]): T[] {
    let currentSet = new Set(arrays[0]);

    for (let i = 1; i < arrays.length; i++) {
       currentSet = currentSet.intersection(new Set(arrays[i]));
    }

    return Array.from(currentSet) as T[];
}

function computeDivisionInfoImpl(division: Division): CueContainerInfo;
function computeDivisionInfoImpl(division: Division, responseActorCollection: string[][]): CueContainerInfo;
function computeDivisionInfoImpl(division: Division, responseActorCollection?: string[][]): CueContainerInfo {
    const actorsCollection: Set<string> = new Set();
    const addActors =
        (textCue: TextCue) => textCue.actors.forEach(actorsCollection.add.bind(actorsCollection))
    for (const textCuePair of division.textCues) {
        if (textCuePair.request)
            addActors(textCuePair.request);
        addActors(textCuePair.response);
        responseActorCollection?.push(textCuePair.response.actors);
    }

    const actors = Array.from(actorsCollection);
    actors.sort();

    return {
        actors,
        textCues: division.textCues.length,
    };
}

export function computeDivisionInfo(division: Division): CueContainerInfo {
    return computeDivisionInfoImpl(division);
}

export interface ScriptInfo extends CueContainerInfo {
    self: string|undefined
}

export function computeScriptInfo(script: Script): ScriptInfo {
    let textCues = 0;
    const actorsSet: Set<string> = new Set();

    const responseActors: string[][] = [];
    for (const division of script.divisions) {
        const { 
            actors: divisionActors,
            textCues: divisionTextCues,
        } = computeDivisionInfoImpl(division, responseActors);
        divisionActors.forEach(actorsSet.add.bind(actorsSet));
        textCues += divisionTextCues;
    }

    const actors = Array.from(actorsSet);
    actors.sort();

    let commonActors = commonElements(responseActors);
    let self = commonActors.length === 1 ? commonActors[0] : undefined;

    return { actors, textCues, self };
}

export function pluralize(count: number, singular: string, plural: string): string {
    if (count === 1)
        return `1 ${singular}`
    return `${count} ${plural}`
}

export function createInvalidatable<T>(fn: Accessor<T>): [Accessor<T>, () => void] {
    const [pullSignal, setSignal] = createSignal({});

    const read = createMemo(() => {
        pullSignal();
        return untrack(fn);
    });

    return [read, () => setSignal({})];
}
