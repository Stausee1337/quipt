import { JSX, createContext, createEffect, createMemo, createSignal, getOwner, onCleanup, onMount, runWithOwner, useContext } from 'solid-js';
import { EditorView, minimalSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { placeholder } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Script, TextCue, TextCuePair } from '../backend';
import { renderCue } from './TextCueView';
import { ScriptContextObj } from '../script';
import { DivisionInfoView } from './DivisionInfoView';
import { useNavigate, useParams } from '@solidjs/router';
import { DialogManager } from '../dialog';

const myTheme = EditorView.theme({}, {dark: true})

const customMarkdownStyle = HighlightStyle.define([
    // Color for the Markdown formatting markers (e.g., **, _, #)
    { tag: tags.processingInstruction, color: "rgb(167.4375, 167.4375, 167.4375)" },
    { tag: tags.meta, color: "#ff6b81" },
    { tag: tags.strong, fontWeight: "bold" },
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.strikethrough, textDecoration: "line-through" },
]);

function Editor(props: {
    content: string,
    onChange?: (content: string) => void
}): JSX.Element {
    const view = new EditorView({
        doc: props.content,
        extensions: [
            myTheme,
            minimalSetup,
            EditorView.lineWrapping,
            placeholder("Text einfügen"),
            markdown(),
            syntaxHighlighting(customMarkdownStyle),
            EditorView.updateListener.of(update => {
                if (update.docChanged)
                    props.onChange?.(update.state.doc.toString());
            })
        ],
    });

    function focusView() {
        const end = view.state.doc.length;
        view.dispatch({
            selection: { anchor: end, head: end },
            scrollIntoView: true,
        });
        view.focus();
    }

    onMount(() => {
        setTimeout(focusView)
    })

    return view.dom;
}

const EditableCueContextObj = createContext<(res: "dismiss"|"accept") => void>();

function EditCommitView(): JSX.Element {
    const close = useContext(EditableCueContextObj);
    return (
        <div class="edit-commit-container">
            <button class="icon-button" onClick={() => close?.("dismiss")}>
                <i class="bi bi-x"/>
            </button>
            <button class="icon-button" onClick={() => close?.("accept")}>
                <i class="bi bi-check2"/>
            </button>
        </div>
    );
}

function EditableTextCue(
    props: {
        textCue: Readonly<TextCue>|null,
        type: "request"|"response"
    }
): JSX.Element {
    const owner = getOwner()!;
    owner.context = { ...owner.context, [EditableCueContextObj.id]: closeEditor };

    const [textCue, setTextCue] = createSignal<TextCue>(
        window.structuredClone(props.textCue) ?? { text: null, actors: [] });

    let revoker: (() => void)|undefined;
    const [content, setContent] = createSignal<string>(textCue().text ?? '');

    const cueComponent = createMemo(() => {
        const cue = renderCue(textCue(), props.type);

        onMount(() => {
            cue.cueElement.addEventListener('click', onClick);
        });

        onCleanup(() => {
            cue.cueElement.removeEventListener('click', onClick);
        });

        return cue;
    });

    function onClick() {
        if (revoker === undefined) {
            const comp = cueComponent();
            comp.cueElement.classList.add('editing');
            revoker = comp.injectContent(
                runWithOwner(owner, () =>
                    <Editor content={content()} onChange={setContent}/>
                )
            );
            comp.addExtension(EditCommitView);
        }
    }

    function closeEditor(res: "dismiss"|"accept") {
        if (revoker !== undefined) {
            const comp = cueComponent();

            revoker();
            comp.cueElement.classList.remove('editing');
            comp.removeExtension(EditCommitView);

            if (res === "accept")
                setTextCue(p => ({ actors: p.actors, text: content() }));
            else
                setContent(textCue().text ?? '');

            revoker = undefined;
        }
    }

    return <>{ cueComponent() }</>;
}

function GapInjectHandle(
    props: { static?: boolean }
): JSX.Element {
    return (
        <div class="gap-inject-handle" classList={{ static: props.static }}>
            { props.static ? null : <i class="bi bi-plus-circle"/> }
        </div>
    );
}

function renderCuePair(textCuePair: Readonly<TextCuePair>): JSX.Element {
    return (
        <>
            <EditableTextCue textCue={textCuePair.request} type="request"/>
            <GapInjectHandle static/>
            <EditableTextCue textCue={textCuePair.response} type="response"/>
            <GapInjectHandle/>
        </>
    )
}

function CreateCueDialog() {
    return (
        <>
            <h2>Einsatz hinzufügen</h2>
        </>
    );
}

function ScriptCueView(
    props: {
        script: Readonly<Script>
    }
): JSX.Element {
    onMount(() => {
        document.title = `${props.script.name} - Quipt`
    })
    
    createEffect(() => {
        document.title = `${props.script.name} - Quipt`
    })

    function onClick(event: MouseEvent) {
        const path = event.composedPath();
        const handle = path.find(
            t => (t instanceof HTMLDivElement)
            && t.classList.contains('gap-inject-handle')) as HTMLDivElement|undefined;
        if (handle === undefined) return;
        DialogManager.openDialog(
            CreateCueDialog
        );
    }

    return (
        <div class="desktop-view">
            <h2 class="script-title">{ props.script.name }</h2>
            <div class="grid-layout-filler overview">
                <div class="division-overview">
                </div>
            </div>
            <div class="grid-layout-filler cues">
                <div class="readable-content-view">
                {
                    props.script.divisions.map(division => {
                        return (
                            <div class="script-divsion" onClick={onClick}>
                                <h2>{ division.name }</h2>
                                <DivisionInfoView division={division}/>
                                <GapInjectHandle/>
                                { division.textCues.map(renderCuePair) }
                            </div>
                        );
                    })
                } 
                </div>
            </div>
        </div>
    );
}

export function ScriptViewer(): JSX.Element {
    const params = useParams();
    const navigate = useNavigate();

    const scriptContext = useContext(ScriptContextObj)!;

    onMount(() => {
        if (params.uuid === undefined) {
            navigate('/');
        }
    })

    return (
        <>
            {
                scriptContext.instantiateDelayed(ScriptCueView, () => navigate('/'))
            }
        </>
    );
}
