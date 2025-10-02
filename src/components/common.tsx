import { JSX } from "solid-js";
import { Lexer, MarkedToken } from 'marked';
import { Division, TextCue } from "../backend";
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

export function formatMarkdown(markdown: string): FormattedString { 
    function* mapToken(tokens: MarkedToken[], style: JSX.CSSProperties|null = null): Generator<FormattedStringElement> {
        for (const token of tokens) {
            switch (token.type) {
                case 'text':
                    yield { style, string: token.text };
                    break;
                case 'em':
                    yield* mapToken(token.tokens as MarkedToken[], { ...style, 'font-style': 'italic' });
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

export interface DivisionInfo {
    actors: string[],
    textCues: number
}

export function computeDivisionInfo(division: Readonly<Division>): DivisionInfo {
    const actorsCollection: Set<string> = new Set();
    const addActors =
        (textCue: Readonly<TextCue>) => textCue.actors.forEach(actorsCollection.add.bind(actorsCollection))
    for (const textCuePair of division.textCues) {
        if (textCuePair.request !== null)
            addActors(textCuePair.request);
        addActors(textCuePair.response);
    }

    const actors = Array.from(actorsCollection);
    actors.sort();
    return {
        actors,
        textCues: division.textCues.length
    };
}

export function pluralize(count: number, singular: string, plural: string): string {
    if (count === 1)
        return `1 ${singular}`
    return `${count} ${plural}`
}
