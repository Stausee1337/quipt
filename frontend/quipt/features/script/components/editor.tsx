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
import { EditorState, Plugin } from 'prosemirror-state';
import { Mark } from 'prosemirror-model';
import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';

import { IconButton } from 'quipt/components/icon-button';
import { useScriptEditorManager } from '../model/hooks';
import { type FontStyle, type FontStyles, formattedStringSchema } from '../model/editor';

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
});

export default function FontStyleToggleGroup({
    selection,
    onFontStylesChange,
}: {
    selection: Selection;
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

class Selection {
    constructor(
        public rect: DOMRect,
        public fontStyles: FontStyles,
    ) {}

    getBoundingClientRect(): DOMRect {
        return this.rect;
    }
}

function selectionObserver(
    onSelectionChange: (selection: Selection | undefined) => void,
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

        onSelectionChange(new Selection(rect, fontStyles));
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

export function Editor({ state }: { state: EditorState }): JSX.Element {
    const [currentSelection, setCurrentSelection] = useState<Selection>();

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
