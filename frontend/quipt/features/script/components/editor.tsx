import { type JSX, type RefObject, useEffect, useState, useRef, useCallback } from 'react';

import { Popover, Toggle, ToggleGroup } from '@base-ui/react';
import { EditorView } from 'prosemirror-view';
import { EditorState, Plugin, Selection } from 'prosemirror-state';
import { Mark, MarkType, Node, Schema } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';

import { IconButton } from 'quipt/components/icon-button';
import { FormattedString, FontStyles } from 'quipt/formatted-string';
import { useScriptEditorManager } from './script';

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
    'Ctrl-b': (state, dispatch) => toggleMark(formattedStringSchema.marks.bold)(state, dispatch),
    'Ctrl-i': (state, dispatch) => toggleMark(formattedStringSchema.marks.italic)(state, dispatch),
    'Ctrl-u': (state, dispatch) =>
        toggleMark(formattedStringSchema.marks.underline)(state, dispatch),
});

function styleToMarks(style: FontStyles): Mark[] {
    const result: Mark[] = [];
    if (style & FontStyles.Italic) result.push(formattedStringSchema.mark('italic'));
    if (style & FontStyles.Bold) result.push(formattedStringSchema.mark('bold'));
    if (style & FontStyles.Underline) result.push(formattedStringSchema.mark('underline'));
    return result;
}

function formattedStringToDocument(string: FormattedString): Node {
    return formattedStringSchema.node(
        'string',
        null,
        Array.from(
            string.flatMap(element =>
                element.content
                    .split('\n')
                    .map(line =>
                        line.length > 0
                            ? formattedStringSchema.text(line, styleToMarks(element.fontStyles))
                            : undefined,
                    )
                    .filter(element => element !== undefined),
            ),
        ),
    );
}

function mapToStyles(selected: ('bold' | 'italic' | 'underline')[]): FontStyles {
    let styles = FontStyles.None;
    for (let option of selected)
        switch (option) {
            case 'bold':
                styles |= FontStyles.Bold;
                break;
            case 'italic':
                styles |= FontStyles.Italic;
                break;
            case 'underline':
                styles |= FontStyles.Underline;
                break;
        }
    return styles;
}

export default function FontStyleToggleGroup({
    selection,
    onFontStylesChange,
}: {
    selection: Selection2;
    onFontStylesChange: (changedStyles: FontStyles) => void;
}) {
    const activeOptions: ('bold' | 'italic' | 'underline')[] = [];
    if (selection.fontStyles & FontStyles.Bold) activeOptions.push('bold');
    if (selection.fontStyles & FontStyles.Italic) activeOptions.push('italic');
    if (selection.fontStyles & FontStyles.Underline) activeOptions.push('underline');
    return (
        <ToggleGroup
            multiple
            value={activeOptions}
            aria-label="Textstilisierungsoptionen"
            className="bg-background border-accent-30 flex gap-x-2 rounded-xl border p-1 shadow-lg/50"
            onMouseDown={event => event.preventDefault()}
            onValueChange={selected =>
                onFontStylesChange(selection.fontStyles ^ mapToStyles(selected))
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

function ProseMirrorEditor({
    viewRef: parentViewRef,
    setupEditor,
}: ProseMirrorEditorProps): JSX.Element {
    const editorContainer = useRef<HTMLDivElement>(null);

    const viewRef = useRef<EditorView>(null);
    useEffect(() => {
        if (editorContainer.current === null) return;

        const view = (viewRef.current = setupEditor(editorContainer.current));
        if (parentViewRef !== undefined) parentViewRef.current = view;

        view.dispatch(view.state.tr.setSelection(Selection.atEnd(view.state.doc)).scrollIntoView());
        view.focus();

        return () => {
            view.destroy();
            if (viewRef.current === view) {
                viewRef.current = null;
                if (parentViewRef !== undefined) parentViewRef.current = null;
            }
        };
    }, [editorContainer.current]);

    return <div ref={editorContainer} />;
}

class Selection2 {
    constructor(
        public rect: DOMRect,
        public fontStyles: FontStyles,
    ) {}

    getBoundingClientRect(): DOMRect {
        return this.rect;
    }
}

function observerPlugin(
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

        const marks = new Set<MarkType>();
        const recordMark = (mark: Mark) => marks.add(mark.type);
        doc.nodesBetween(selection.from, selection.to, node => node.marks.forEach(recordMark));

        let fontStyles = FontStyles.None;
        if (marks.has(formattedStringSchema.marks.bold)) fontStyles |= FontStyles.Bold;
        if (marks.has(formattedStringSchema.marks.italic)) fontStyles |= FontStyles.Italic;
        if (marks.has(formattedStringSchema.marks.underline)) fontStyles |= FontStyles.Underline;

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

export function Editor({ string }: { string: FormattedString }): JSX.Element {
    const [currentSelection, setCurrentSelection] = useState<Selection2>();
    const viewRef = useRef<EditorView>(null);
    const manager = useScriptEditorManager();

    const setupEditor = useCallback((container: HTMLDivElement) => {
        const state = EditorState.create({
            doc: formattedStringToDocument(string),
        });
        return new EditorView(container, {
            state,
            plugins: [
                editorKeymap,
                observerPlugin(setCurrentSelection, manager.scrollContainer ?? undefined),
            ],
        });
    }, []);

    function handleFontStylesChange(changedFontStyles: FontStyles) {
        if (viewRef.current === null) return;

        const view = viewRef.current;
        if (changedFontStyles & FontStyles.Bold)
            toggleMark(formattedStringSchema.marks.bold)(view.state, view.dispatch);
        if (changedFontStyles & FontStyles.Italic)
            toggleMark(formattedStringSchema.marks.italic)(view.state, view.dispatch);
        if (changedFontStyles & FontStyles.Underline)
            toggleMark(formattedStringSchema.marks.underline)(view.state, view.dispatch);
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
