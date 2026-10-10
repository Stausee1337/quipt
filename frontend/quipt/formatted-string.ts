import type { Properties } from 'csstype';

export type FormattedStringElement = {
    style: Properties | null;
    string: string;
};

export class FormattedString extends Array<FormattedStringElement> {
    /**
     * The unformatted string this represents */
    raw: string = '';

    /**
     * A reference to the input string
     */
    input?: string;

    constructor(arrayLength: number);
    constructor(elements?: Iterable<FormattedStringElement>, input?: string);
    constructor(
        lengthOrElements: Iterable<FormattedStringElement> | number | undefined,
        input?: string,
    ) {
        if (typeof lengthOrElements === 'number') {
            super(lengthOrElements);
            return;
        }

        super();
        if (lengthOrElements === undefined) return;

        this.push(...lengthOrElements);
        // this.raw = this.map(x => x.string).join('');

        if (input !== undefined) this.input = input;

        Object.freeze(this);
    }
}

type Token =
    | {
          type: 'text';
          text: string;
      }
    | {
          type: 'open-tag' | 'close-tag';
          name: string;
      };

const tagRegexp = {
    'open-tag': /(?<!\[)\[([A-Za-z]+)]/,
    'close-tag': /(?<!\[)\[\/([A-Za-z]+)]/,
    escape: /\[{2}/,
} as const;

function* tokenizeBBCode(input: string): Generator<Token> {
    type Match = {
        kind: 'close-tag' | 'open-tag' | 'escape';
        position: number;
        result: RegExpMatchArray;
    };

    let textBuffer = '';
    while (input.length > 0) {
        let match: Match | undefined;
        for (let [kind, value] of Object.entries(tagRegexp) as [keyof typeof tagRegexp, RegExp][]) {
            const m = input.match(value);
            if (m === null) continue;
            const position = m.index ?? 0;
            if (match === undefined || position < match.position) {
                match = {
                    kind,
                    position,
                    result: m,
                };
            }
        }

        const start = match === undefined ? 0 : match.position;

        const length = match === undefined ? input.length : match.result[0].length;

        const preText = input.slice(0, start);
        textBuffer += preText;

        const matchText = input.slice(start, start + length);

        input = input.slice(start + length);
        if (match === undefined) {
            textBuffer += matchText;
            continue;
        }

        switch (match.kind) {
            case 'escape':
                textBuffer += '[';
                break;
            case 'open-tag':
            case 'close-tag':
                yield flushTextBuffer();
                yield {
                    type: match.kind,
                    name: match.result[1],
                };
                break;
        }
    }

    if (textBuffer.length > 0) yield flushTextBuffer();

    function flushTextBuffer(): Token {
        const text = textBuffer;
        textBuffer = '';
        return { type: 'text', text };
    }
}

export type FormatNode =
    | {
          type: 'text';
          text: string;
      }
    | {
          type: 'bold' | 'italic' | 'underline';
          nodes: FormatNode[];
      };

const nameToType: Record<string, 'bold' | 'italic' | 'underline'> = {
    b: 'bold',
    bold: 'bold',
    strong: 'bold',
    i: 'italic',
    italic: 'italic',
    em: 'italic',
    u: 'underline',
    underline: 'underline',
    underlined: 'underline',
};

export function parseBBCode(input: string): FormatNode[] {
    const tokenizer = tokenizeBBCode(input);

    function parseRecursively(tag: string | undefined): FormatNode[] {
        const nodes: FormatNode[] = [];

        while (true) {
            const { value: token, done } = tokenizer.next();
            if (done) {
                if (tag !== undefined)
                    throw new Error(`unexpected EOS, expected closing tag '[/${tag}]`);
                return nodes;
            }

            switch (token.type) {
                case 'text':
                    nodes.push({
                        type: 'text',
                        text: token.text,
                    });
                    break;
                case 'open-tag': {
                    const name = token.name;
                    const children = parseRecursively(name);
                    const type = nameToType[name];
                    if (type === undefined) nodes.push(...children);
                    else nodes.push({ type, nodes: children });
                    break;
                }
                case 'close-tag':
                    if (token.name === tag) return nodes;
                    throw new Error(`unexpected closing tag '[/${token.name}]' in code`);
            }
        }
    }

    return parseRecursively(undefined);
}

export function renderBBCode(bbcode: string): FormattedString {
    function* flattenNodes(
        nodes: FormatNode[],
        style: Properties | null = null,
    ): Generator<FormattedStringElement> {
        for (const node of nodes) {
            switch (node.type) {
                case 'text':
                    yield { style, string: node.text };
                    break;
                case 'italic':
                    yield* flattenNodes(node.nodes, {
                        ...style,
                        fontStyle: 'italic',
                    });
                    break;
                case 'bold':
                    yield* flattenNodes(node.nodes, {
                        ...style,
                        fontWeight: 'bold',
                    });
                    break;
                case 'underline':
                    yield* flattenNodes(node.nodes, {
                        ...style,
                        textDecoration: 'underline',
                    });
                    break;
            }
        }
    }

    const nodes = parseBBCode(bbcode);
    return new FormattedString(flattenNodes(nodes));
}
