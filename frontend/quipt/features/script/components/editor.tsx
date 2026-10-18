import {
    type JSX,
    type RefObject,
    memo,
    useCallback,
    useEffect,
    useId,
    useState,
    useRef,
} from 'react';

import { Popover, Toggle, ToggleGroup } from '@base-ui/react';
import { EditorView } from 'prosemirror-view';
import { EditorState, Plugin, Selection } from 'prosemirror-state';
import { Mark, Node, Schema } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';
import { history, undo } from 'prosemirror-history';

import { IconButton } from 'quipt/components/icon-button';
import { type FormatNode, parseBBCode } from 'quipt/formatted-string';
import { ScriptEditorManager, useScriptEditorManager, type Action } from './script';
import type { EditableScriptNode, Key, TransientState } from '../state';

const formattedStringSchema = new Schema({
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

const editorKeymap = keymap({
    Enter: (state, dispatch) => {
        const br = state.schema.nodes.hard_break;

        if (dispatch) {
            dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView());
        }

        return true;
    },
    'Ctrl-b': toggleMark(formattedStringSchema.marks.bold),
    'Ctrl-i': toggleMark(formattedStringSchema.marks.italic),
    'Ctrl-u': toggleMark(formattedStringSchema.marks.underline),
    'Ctrl-z': undo,
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

export function updateItemContent(
    itemKey: Key<EditableScriptNode>,
    editorState: EditorState,
): Action {
    return (state: TransientState) => {
        state.replaceNode(itemKey, {
            content: editorState,
            text: convertDocToBBCode(editorState.doc),
        });
    };
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
                    manager.dispatch(updateItemContent(itemKey, view.state));
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
        plugins: [history(), listenDocumentChange(itemKey, manager)],
        selection: Selection.atEnd(doc),
    });
}

type FontStyle = 'italic' | 'bold' | 'underline';
type FontStyles = Set<FontStyle>;

export default function FontStyleToggleGroup({
    selection,
    onFontStylesChange,
}: {
    selection: Selection2;
    onFontStylesChange: (changedStyles: FontStyles) => void;
}) {
    return (
        <ToggleGroup
            multiple
            value={Array.from(selection.fontStyles)}
            aria-label="Textstilisierungsoptionen"
            className="bg-background border-accent-30 flex gap-x-2 rounded-xl border p-1 shadow-lg/50"
            onMouseDown={event => event.preventDefault()}
            onValueChange={selected =>
                onFontStylesChange(selection.fontStyles.symmetricDifference(new Set(selected)))
            }>
            <IconButton
                iconName="type-bold"
                render={
                    <Toggle
                        aria-label="Fett"
                        value="bold"
                        className="text-foreground data-pressed:text-primary"
                    />
                }
            />
            <IconButton
                iconName="type-italic"
                render={
                    <Toggle
                        aria-label="Kursiv"
                        value="italic"
                        className="text-foreground data-pressed:text-primary"
                    />
                }
            />
            <IconButton
                iconName="type-underline"
                render={
                    <Toggle
                        aria-label="Unterstrichen"
                        value="underline"
                        className="text-foreground data-pressed:text-primary"
                    />
                }
            />
        </ToggleGroup>
    );
}

interface ProseMirrorEditorProps {
    viewRef?: RefObject<EditorView | null>;
    setupEditor(element: HTMLDivElement): EditorView;
}

const ProseMirrorEditor = memo(function ProseMirrorEditor({
    viewRef: parentViewRef,
    setupEditor,
}: ProseMirrorEditorProps): JSX.Element {
    const [editorContainer, setEditorContainer] = useState<HTMLDivElement | null>(null);
    const id = useId();

    const viewRef = useRef<EditorView>(null);
    useEffect(() => {
        if (editorContainer === null) return;

        const view = (viewRef.current = setupEditor(editorContainer));
        if (parentViewRef !== undefined) parentViewRef.current = view;

        view.focus();

        return () => {
            view.destroy();
            if (viewRef.current === view) {
                viewRef.current = null;
                if (parentViewRef !== undefined) parentViewRef.current = null;
            }
        };
    }, [editorContainer, setupEditor]);

    return <div id={id} ref={setEditorContainer} />;
});

class Selection2 {
    constructor(
        public rect: DOMRect,
        public fontStyles: FontStyles,
    ) {}

    getBoundingClientRect(): DOMRect {
        return this.rect;
    }
}

function selectionObserver(
    onSelectionChange: (selection: Selection2 | undefined) => void,
    scrollContainer?: HTMLElement,
): Plugin {
    function updateSelectionRect(view: EditorView) {
        const domSelection = view.dom.ownerDocument.getSelection();
        const { doc, selection } = view.state;

        if (
            !view.hasFocus() ||
            domSelection === null ||
            domSelection.rangeCount === 0 ||
            domSelection.type !== 'Range' ||
            selection.empty
        ) {
            onSelectionChange(undefined);
            return;
        }

        const fontStyles: FontStyles = new Set();
        const recordMark = (mark: Mark) => fontStyles.add(mark.type.name as FontStyle);
        doc.nodesBetween(selection.from, selection.to, node => node.marks.forEach(recordMark));

        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        onSelectionChange(new Selection2(rect, fontStyles));
    }

    return new Plugin({
        props: {
            handleDOMEvents: {
                focus(view) {
                    updateSelectionRect(view);
                },
                blur(view) {
                    updateSelectionRect(view);
                },
            },
        },
        view(view) {
            const handleScroll = () => updateSelectionRect(view);
            scrollContainer?.addEventListener('scroll', handleScroll);
            return {
                update(view) {
                    updateSelectionRect(view);
                },
                destroy() {
                    scrollContainer?.removeEventListener('scroll', handleScroll);
                },
            };
        },
    });
}

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

export function Editor({ state }: { state: EditorState }): JSX.Element {
    const [currentSelection, setCurrentSelection] = useState<Selection2>();

    const viewRef = useRef<EditorView>(null);
    const manager = useScriptEditorManager();

    const setupEditor = useCallback((container: HTMLDivElement) => {
        return new EditorView(container, {
            state,
            plugins: [
                editorKeymap,
                selectionObserver(setCurrentSelection, manager.scrollContainer ?? undefined),
            ],
        });
    }, []);

    useEffect(() => {
        if (viewRef.current === null) return;
        const view = viewRef.current;
        // console.log('executed', view.state === state);

        if (view.state !== state) view.updateState(state);
    }, [state]);

    function handleFontStylesChange(changedFontStyles: FontStyles) {
        if (viewRef.current === null) return;

        const view = viewRef.current;
        for (let style of changedFontStyles.values())
            toggleMark(formattedStringSchema.marks[style])(view.state, view.dispatch);
    }

    return (
        <>
            <ProseMirrorEditor viewRef={viewRef} setupEditor={setupEditor} />
            <Popover.Root open={currentSelection !== undefined}>
                <Popover.Portal>
                    <Popover.Positioner
                        side="top"
                        align="center"
                        anchor={currentSelection}
                        sideOffset={8}>
                        {currentSelection && (
                            <Popover.Popup initialFocus={false} finalFocus={false}>
                                <FontStyleToggleGroup
                                    selection={currentSelection}
                                    onFontStylesChange={handleFontStylesChange}
                                />
                            </Popover.Popup>
                        )}
                    </Popover.Positioner>
                </Popover.Portal>
            </Popover.Root>
        </>
    );
}
