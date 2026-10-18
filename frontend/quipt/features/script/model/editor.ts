import { EditorState, Plugin, Selection } from 'prosemirror-state';
import { Mark, Node, Schema } from 'prosemirror-model';

import { type FormatNode, parseBBCode } from 'quipt/formatted-string';
import { TransientState, type EditableScriptNode, type Key } from './state';
import type { ScriptEditorManager } from './manager';

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

export function updateItemContent(
    {
        itemKey,
        editorState,
    }: {
        itemKey: Key<EditableScriptNode>;
        editorState: EditorState;
    },
    state: TransientState,
    manager: ScriptEditorManager,
) {
    const item = manager.state.lookup(itemKey);
    if (item.content === editorState) return;
    state.replaceNode(itemKey, {
        content: editorState,
        text: convertDocToBBCode(editorState.doc),
    });
}

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
    itemKey: Key<EditableScriptNode>,
    manager: ScriptEditorManager,
): Plugin {
    return new Plugin({
        view() {
            return {
                update(view, prevState) {
                    if (
                        prevState &&
                        prevState.doc.eq(view.state.doc) &&
                        prevState.selection.eq(view.state.selection)
                    )
                        return;
                    manager.dispatch(updateItemContent, { itemKey, editorState: view.state });
                },
            };
        },
    });
}
export function createEditorState(
    itemKey: Key<EditableScriptNode>,
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
