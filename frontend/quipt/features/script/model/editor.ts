import { EditorState, Plugin, Selection, Transaction } from 'prosemirror-state';
import { Mark, Node, Schema } from 'prosemirror-model';
import { StepMap, Transform } from 'prosemirror-transform';

import { type FormatNode, parseBBCode } from 'quipt/formatted-string';
import { type ContentfulScriptNode, type Key } from './state';
import { type ScriptEditorManager, stateAction } from './manager';

export type FontStyle = 'italic' | 'bold' | 'underline';
export type FontStyles = Set<FontStyle>;

export const formattedStringSchema = new Schema({
    nodes: {
        string: { content: 'inline*', marks: '_' },
        text: { group: 'inline', inline: true },
        hard_break: {
            group: 'inline',
            inline: true,
            selectable: false,
            parseDOM: [{ tag: 'br' }],
            toDOM: () => ['br'],
        },
    },
    marks: {
        italic: {
            toDOM: () => ['i', 0],
        },
        bold: {
            toDOM: () => ['b', 0],
        },
        underline: {
            toDOM: () => ['u', 0],
        },
    },
    topNode: 'string',
});

function emitOpeningTag(output: string[], style: FontStyle) {
    switch (style) {
        case 'bold':
            output.push('[b]');
            break;
        case 'italic':
            output.push('[i]');
            break;
        case 'underline':
            output.push('[u]');
            break;
    }
}

function emitClosingTag(output: string[], style: FontStyle) {
    switch (style) {
        case 'bold':
            output.push('[/b]');
            break;
        case 'italic':
            output.push('[/i]');
            break;
        case 'underline':
            output.push('[/u]');
            break;
    }
}

function escapeBBCode(code: string): string {
    return code.split(/(?=\[)/).reduce((prev, next) => prev + '[' + next);
}

function computeLongestPrefix(openStyles: FontStyle[], marks: readonly Mark[]): FontStyle[] {
    const longest: FontStyle[] = [];
    for (let format of openStyles) {
        if (!marks.some(m => m.type.name === format)) break;
        longest.push(format);
    }
    return longest;
}

function convertDocToBBCode(doc: Node): string {
    let openStyles: FontStyle[] = [];
    const output: string[] = [];

    doc.forEach(node => {
        const target = node.marks;
        const longest = computeLongestPrefix(openStyles, target);

        for (let style of openStyles.slice(longest.length).reverse()) emitClosingTag(output, style);

        openStyles.length = longest.length;
        for (let mark of target)
            if (!longest.includes(mark.type.name as FontStyle)) {
                emitOpeningTag(output, mark.type.name as FontStyle);
                openStyles.push(mark.type.name as FontStyle);
            }

        if (node.text !== undefined && node.text.length > 0) output.push(escapeBBCode(node.text));
        else if (formattedStringSchema.nodes.hard_break === node.type) output.push('\n');
    });

    for (let style of openStyles.reverse()) {
        emitClosingTag(output, style);
    }
    return output.join('');
}

const updateItemContentKey: unique symbol = Symbol('updateItemContent');

// Code from `prosemirror-history`; detecting if to merge two history items
function isAdjacentTo(transform: Transform, prevRanges: readonly number[]) {
    if (!prevRanges) return false;
    if (!transform.docChanged) return true;
    let adjacent = false;
    transform.mapping.maps[0].forEach((start, end) => {
        for (let i = 0; i < prevRanges.length; i += 2)
            if (start <= prevRanges[i + 1] && end >= prevRanges[i]) adjacent = true;
    });
    return adjacent;
}

function rangesFor(maps: readonly StepMap[]) {
    let result: number[] = [];
    for (let i = maps.length - 1; i >= 0 && result.length == 0; i--)
        maps[i].forEach((_from, _to, from, to) => result.push(from, to));
    return result;
}

export type UpdateItemContentProps = {
    itemKey: Key<ContentfulScriptNode>;
    tr: Transaction;
    editorState: EditorState;
};

const updateItemContent = stateAction<UpdateItemContentProps>({
    apply({ itemKey, tr: transaction, editorState }, state) {
        state.setMeta(updateItemContentKey, transaction);

        const item = state.lookup(itemKey);
        if (item.content === editorState) return;
        state.replaceNode(itemKey, {
            content: editorState,
            text: convertDocToBBCode(editorState.doc),
        });
    },
    merge(prevState, currentState) {
        const prev = prevState.getMeta(updateItemContentKey);
        const current = currentState.getMeta(updateItemContentKey);
        if (!(prev instanceof Transaction) || !(current instanceof Transaction)) return false;

        if (current.time - prev.time > 750) return false;
        const prevRanges = rangesFor(prev.mapping.maps);

        return isAdjacentTo(current, prevRanges);
    },
});

function* formatToDocumentNodes(nodes: FormatNode[], marks: Mark[] = []): Generator<Node> {
    for (const node of nodes) {
        switch (node.type) {
            case 'text': {
                const lines = node.text.split('\n');
                for (let idx = 0; idx < lines.length; idx++) {
                    if (idx > 0) yield formattedStringSchema.node('hard_break', marks);
                    const line = lines[idx];
                    if (line.length > 0) yield formattedStringSchema.text(line, marks);
                }
                break;
            }
            case 'italic':
                yield* formatToDocumentNodes(node.nodes, [
                    ...marks,
                    formattedStringSchema.mark('italic'),
                ]);
                break;
            case 'bold':
                yield* formatToDocumentNodes(node.nodes, [
                    ...marks,
                    formattedStringSchema.mark('bold'),
                ]);
                break;
            case 'underline':
                yield* formatToDocumentNodes(node.nodes, [
                    ...marks,
                    formattedStringSchema.mark('underline'),
                ]);
                break;
        }
    }
}

function bbCodeToDocument(bbCode: string): Node {
    const nodes = parseBBCode(bbCode);
    return formattedStringSchema.node('string', null, Array.from(formatToDocumentNodes(nodes)));
}

function listenDocumentChange(
    itemKey: Key<ContentfulScriptNode>,
    manager: ScriptEditorManager,
): Plugin {
    return new Plugin({
        state: {
            init() {},

            apply(tr, _, prevState, newState) {
                if (
                    prevState &&
                    prevState.doc.eq(newState.doc) &&
                    prevState.selection.eq(newState.selection)
                )
                    return;
                manager.dispatchStateAction(updateItemContent, {
                    itemKey,
                    tr,
                    editorState: newState,
                });
            },
        },
    });
}
export function createEditorState(
    itemKey: Key<ContentfulScriptNode>,
    text: string,
    manager: ScriptEditorManager,
): EditorState {
    const doc = bbCodeToDocument(text);
    return EditorState.create({
        doc,
        plugins: [listenDocumentChange(itemKey, manager)],
        selection: Selection.atEnd(doc),
    });
}
