import { JSX } from "solid-js";
import { Lexer, MarkedToken } from 'marked';

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
            result.push(item.string);
        } else {
            result.push(<span style={item.style}>{item.string}</span>);
        }
    }

    return result;
}
function generateSunflowerColor(idx: number, saturation = 95, value = 70): string {
    const PHI = (5 ** 0.5 + 1) * 0.5;
	return `hsl(${((PHI * idx) % 1) * 360}deg, ${saturation}%, ${value}%)`;
}

function generateHash(str: string): number {
    let hash = 0;
    for (const char of str) {
        hash = (hash << 5) - hash + char.charCodeAt(0);
        hash |= 0; // Constrain to 32bit integer
    }
    return hash;
};

export function formatActorsArray(actors: string[]|null): FormattedString|null {
    if (actors === null)
        return null;
    if (actors.length === 0)
        return null;

    const result: FormattedString = actors
        .map(actor => [generateSunflowerColor(generateHash(actor)), actor])
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
                    continue;
                case 'em':
                    yield* mapToken(token.tokens as MarkedToken[], { ...style, 'font-style': 'italic' });
                    continue;
                case 'strong':
                    yield* mapToken(token.tokens as MarkedToken[], { ...style, 'font-weight': 'bold' });
                    continue;
                default:
                    throw 'unreachable'
            }
        }
    }

    const tokens = Lexer.lexInline(markdown) as MarkedToken[];
    return Array.from(mapToken(tokens));
}
