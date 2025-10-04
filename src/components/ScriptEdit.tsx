import { JSX, createEffect, getOwner, onCleanup, onMount, runWithOwner, useContext } from 'solid-js';
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
    { tag: tags.processingInstruction, color: "#e3e3e3" },
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
    return view.dom;
}

function EditableTextCue(
    props: {
        textCue: Readonly<TextCue>|null,
        type: "request"|"response"
    }
): JSX.Element {
    const cueComponent = renderCue(props.textCue, props.type);
    let revoker: (() => void)|undefined;
    let owner = getOwner()!;

    function onClick() {
        if (revoker === undefined) {
            cueComponent.cueElement.classList.add('editing');
            revoker = cueComponent.injectContent(
                runWithOwner(owner, () =>
                    <>
                        <Editor content={props.textCue?.text ?? ''} onChange={console.log}/>
                        <div class="edit-commit-container"></div>
                    </>
                )
            );
        }
    }

    onMount(() => {
        cueComponent.cueElement.addEventListener('click', onClick);
    });

    onCleanup(() => {
        cueComponent.cueElement.removeEventListener('click', onClick);
    });

    return cueComponent;
}

function GapInjectHandle(
    props: { static?: boolean }
): JSX.Element {
    return (
        <div class="gap-inject-handle" classList={{ static: props.static }}>
            {
                props.static ? null : <i class="bi bi-plus-circle"/>
            }
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
