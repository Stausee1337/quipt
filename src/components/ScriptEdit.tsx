import { JSX, createContext, createDeferred, createEffect, createMemo, createSignal, getOwner, onCleanup, onMount, splitProps, useContext, createRoot, runWithOwner, Owner } from 'solid-js';
import { EditorView, minimalSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { placeholder } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Division, Script, TextCue, TextCuePair } from '../backend';
import { ExposedComponentType, TextCueView, renderCue } from './TextCueView';
import { ScriptContextObj } from '../script';
import { DivisionInfoView } from './DivisionInfoView';
import { useNavigate, useParams } from '@solidjs/router';
import { insert } from 'solid-js/web';
import { ScriptInfo, computeScriptInfo, createInvalidatable } from './common';
import { ActorPill } from './ActorPill';
import { reference } from '@popperjs/core';

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
    content?: string,
    onChange?: (content: string) => void,
    autofocus?: boolean
}): JSX.Element {
    const view = new EditorView({
        doc: props.content,
        extensions: [
            myTheme,
            minimalSetup,
            EditorView.lineWrapping,
            placeholder("Text einfügen ..."),
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
        if (props.autofocus)
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
                    <Editor content={content()} onChange={setContent} autofocus/>
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
    props: { static?: boolean } & JSX.HTMLAttributes<HTMLDivElement>
): JSX.Element {
    const [, rest] = splitProps(props, [
        "static", "classList", "style", "children"
    ]);
    return (
        <div class="gap-inject-handle" classList={{ static: props.static }} {...rest}>
            { props.static ? null : <i class="bi bi-plus-circle"/> }
        </div>
    );
}

function renderCuePair(textCuePair: Readonly<TextCuePair>, idx: number): JSX.Element {
    return (
        <>
            <EditableTextCue textCue={textCuePair.request} type="request"/>
            <GapInjectHandle static/>
            <EditableTextCue textCue={textCuePair.response} type="response"/>
            <GapInjectHandle data-index={idx}/>
        </>
    )
}

function ActorsSelector(
    props: {
        self?: string,
        actors: string[],
        onSelectionChange: (selected: string[]) => void
    }
): JSX.Element {
    const [selected, setSelected] = createSignal<string[]>([]);

    function toggleSelection(event: MouseEvent & { currentTarget: HTMLSpanElement }) {
        const target = event.currentTarget;
        const isSelected = target.classList.toggle('selected');
        const currentActor = target.dataset.actor!;

        setSelected(prev => [
            ...(isSelected ? prev : prev.filter(x => x !== currentActor)),
            ...(isSelected ? [currentActor] : [])
        ])
    }

    createDeferred(() => {
        props.onSelectionChange(selected());
    })
    
    return (
        <div class="actors-selector">
            {
                props.self === undefined ? null
                    : <ActorPill actor="Ich"
                        actorForColor={props.self}
                        classList={{ selected: true }}
                        static/>
            }
            {
                props.actors
                    .filter(actor => actor !== props.self)
                    .map(
                        actor => <ActorPill actor={actor}
                            data-actor={actor}
                            onClick={toggleSelection}/>
                    )
            }
        </div>
    );
}

function NewTextCueView(
    props: {
        type: "request"|"response",
        actors: string[],
        self?: string,
        onChange: (cue: TextCue) => void
    }
): JSX.Element {
    const [selectedActors, setSelectedActors] = createSignal<string[]>([]);
    const [content, setContent] = createSignal<string>("");
    const component = <TextCueView
        type={props.type}
        actorsInfo={null}
        text={[]}/> as ExposedComponentType;
    component.injectContent(<Editor onChange={setContent} autofocus={props.type === "request"}/>);
    component.addExtension(() => <ActorsSelector
                           self={props.self}
                           actors={props.actors}
                           onSelectionChange={setSelectedActors}/>, "before");
    createEffect(() => {
        props.onChange({
            text: content(),
            actors: props.self === undefined
                ? selectedActors()
                : [...selectedActors(), props.self]
        });
    })

    return component;
}


function NewCueInserter(
    props: {
        self: string|undefined,
        actors: string[],
        ref?: HTMLDivElement | ((el: HTMLDivElement) => void)
    }
): JSX.Element {
    const cueInsertContext = useContext(CueInsertionContextObj)!;

    const [request, setRequest] = createSignal<TextCue>({ text: '', actors: [] });
    const [response, setResponse] = createSignal<TextCue>({
        text: '',
        actors: props.self === undefined ? [] : [props.self]
    });

    const isValidCue = (cue: TextCue) => cue.actors.length > 0 && cue.text.length > 0;

    const isValid = createMemo(() => {
        return isValidCue(request()) && isValidCue(response());
    });

    function buildCuePair() {
        return {
            request: request(),
            response: response(),
        }
    }

    return (
        <div ref={props.ref} class="cue-insert-container">
            <NewTextCueView type="request" 
                onChange={setRequest}
                actors={props.actors.filter(a => a !== props.self)}/>
            <NewTextCueView type="response" 
                onChange={setResponse}
                actors={props.actors}
                self={props.self}/>
            <div class="bottom-line">
                <button class="secondary-button"
                    onClick={() => cueInsertContext.cancel()}>
                    Abbrechen
                </button>
                <button class="primary-button" 
                    onClick={() => cueInsertContext.confirmWithCue(buildCuePair())}
                    disabled={!isValid()}>
                    Hinzufügen
                </button>
            </div>
        </div>
    );
}

interface CueInsertionContext {
    cancel(): void;
    confirmWithCue(cue: Omit<TextCuePair, "previousScores">): void;
}

const CueInsertionContextObj = createContext<CueInsertionContext>();
type InsertedCue = Omit<TextCuePair, "previousScores"> & {
    index: number,
    division: number
};

function createCueInserter(
    handle: HTMLDivElement,
    scriptInfo: ScriptInfo,
    detachedOwner: typeof Owner
): Promise<InsertedCue|undefined> {
    let resolve: (res: InsertedCue|undefined) => void;
    const promise = new Promise<InsertedCue|undefined>(resolve1 => resolve = resolve1);

    createRoot(dispose => {
        const divisionElement = handle.parentElement!;
        const index = Number(handle.dataset.index) + 1;
        const division = Number(divisionElement.dataset.division);

        const context: CueInsertionContext = {
            cancel() {
                divisionElement.insertBefore(handle, insertContainer);
                insertContainer.remove();
                dispose();
                resolve(undefined);
            },
            confirmWithCue(cue) {
                dispose();
                resolve({ ...cue, index, division });
            },
        };

        onCleanup(() => {
            console.log('onCleanup');
        })

        let insertContainer: HTMLDivElement;
        const content = (
            <CueInsertionContextObj.Provider value={context}>
                <NewCueInserter ref={insertContainer} actors={scriptInfo.actors} self={scriptInfo.self}/>
            </CueInsertionContextObj.Provider>
        );
        insert(divisionElement, content, handle);
        handle.remove();
    }, detachedOwner);

    return promise;
}

function ScriptCueView(
    props: {
        script: Readonly<Script>
    }
): JSX.Element {
    const owner = getOwner()!;
    onMount(() => {
        document.title = `${props.script.name} - Quipt`
    })
    
    createEffect(() => {
        document.title = `${props.script.name} - Quipt`
    })

    const script = window.structuredClone(props.script);
    const scriptInfo = computeScriptInfo(script);

    async function onClick(event: MouseEvent) {
        const path = event.composedPath();
        const handle = path.find(
            t => (t instanceof HTMLDivElement)
            && t.classList.contains('gap-inject-handle')) as HTMLDivElement|undefined;
        if (handle === undefined) return;

        const newCue = await createCueInserter(handle, scriptInfo, owner);
        if (newCue === undefined) return;

        const division = script.divisions[newCue.division];
        division.textCues.splice(
            newCue.index,
            0,
            { 
                request: newCue.request,
                response: newCue.response,
                previousScores: []
            }
        );
        invalidatables[newCue.division][1]();
    }

    function renderDivision(division: Division, idx: number): JSX.Element {
        return (
            <div class="script-divsion" onClick={onClick} data-division={idx}>
                <h2>{ division.name }</h2>
                <DivisionInfoView division={division}/>
                <GapInjectHandle data-index={-1}/>
                { division.textCues.map(renderCuePair) }
            </div>
        );
    }

    const invalidatables = script.divisions.map(
        (division, idx) => createInvalidatable(() => renderDivision(division, idx)))

    const divisionElements = createMemo(() => invalidatables.map(([element]) => element()));

    return (
        <div class="desktop-view">
            <h2 class="script-title">{ script.name }</h2>
            <div class="grid-layout-filler overview">
                <div class="division-overview">
                </div>
            </div>
            <div class="grid-layout-filler cues">
                <div class="readable-content-view">
                    { divisionElements() } 
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
