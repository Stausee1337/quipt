import { JSX, createContext, createDeferred, createEffect, createMemo, createSignal, getOwner, onCleanup, onMount, splitProps, useContext, createRoot, runWithOwner, Owner } from 'solid-js';
import { EditorView, minimalSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { placeholder } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Division, Script, TextCue, TextCuePair } from '../backend';
import { ExposedComponentType, TextCueView, renderCue } from './TextCueView';
import { ScriptContextObj } from '../script';
import { DivisionInfoComponent, DivisionInfoView } from './DivisionInfoView';
import { useNavigate, useParams } from '@solidjs/router';
import { insert } from 'solid-js/web';
import { ScriptInfo, computeScriptInfo, createInvalidatable } from './common';
import { ActorPill } from './ActorPill';
import { ExposedComponent } from '../exposed-component';
import { installContextMenuHandler, toggleMenu } from '../popover-menu';

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

function CueEditMenu(props: {
    onEdit: () => void,
    onDelete: () => void,
}): JSX.Element {
    return (
        <ul class="menu-options">
            <li onClick={props.onDelete}>Löschen</li>
            <li onClick={props.onEdit}>Bearbeiten</li>
        </ul>
    );
}

function EditableTextCue(
    props: {
        textCue: Readonly<TextCue>|null,
        type: "request"|"response",
        idx: number
    }
): JSX.Element {
    const editContext = useContext(ScriptEditContextObj)!;

    const owner = getOwner()!;
    owner.context = { ...owner.context, [EditableCueContextObj.id]: closeEditor };

    const [textCue, setTextCue] = createSignal<TextCue>(
        window.structuredClone(props.textCue) ?? { text: null, actors: [] });

    let revoker: (() => void)|undefined;
    const [content, setContent] = createSignal<string>(textCue().text ?? '');

    const cueComponent = createMemo(() => {
        const cue = renderCue(textCue(), props.type);

        installContextMenuHandler(
            cue.cueElement,
            "mouse",
            CueEditMenu,
            { onEdit, onDelete }
        );

        onMount(() => {
            cue.cueElement.addEventListener('contextmenu', toggleMenu as any);
        })

        onCleanup(() => {
            cue.cueElement.removeEventListener('contextmenu', toggleMenu as any);
        })

        return cue;
    });

    function onDelete() {

    }

    function onEdit() {
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

            if (res === "dismiss")
                setContent(textCue().text ?? '');
            else {
                setTextCue(p => ({ actors: p.actors, text: content() }));
                editContext.updateCue(props.idx, p => ({ ...p, [props.type]: textCue() }));
            }

            revoker = undefined;
        }
    }

    return <>{ cueComponent() }</>;
}

function GapInjectHandle(
    props: { static?: boolean } & JSX.HTMLAttributes<HTMLDivElement>
): JSX.Element {
    const owner = getOwner();
    const editContext = useContext(ScriptEditContextObj)!;
    const [, rest] = splitProps(props, [
        "static", "classList", "style", "children"
    ]);

    let handle: HTMLDivElement;
    async function onClick() {
        const newCue = await createCueInserter(handle, editContext.scriptInfo, owner);
        if (newCue === undefined) return;

        editContext.insertCue(
            newCue.index,
            { 
                request: newCue.request,
                response: newCue.response,
                previousScores: []
            }
        );
    }

    return (
        <div ref={handle} class="gap-inject-handle" onClick={onClick} classList={{ static: props.static }} {...rest}>
            { props.static ? null : <i class="bi bi-plus-circle"/> }
        </div>
    );
}

function renderCuePair(textCuePair: Readonly<TextCuePair>, idx: number): JSX.Element {
    return (
        <>
            <EditableTextCue textCue={textCuePair.request} idx={idx} type="request"/>
            <GapInjectHandle static/>
            <EditableTextCue textCue={textCuePair.response} idx={idx} type="response"/>
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

        const context: CueInsertionContext = {
            cancel() {
                divisionElement.insertBefore(handle, insertContainer);
                insertContainer.remove();
                dispose();
                resolve(undefined);
            },
            confirmWithCue(cue) {
                dispose();
                resolve({ ...cue, index });
            },
        };

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

function DivisionEditMenu(
    props: {
        onEdit: () => void,
        onRename: () => void
    }
): JSX.Element {
    return (
        <ul class="menu-options">
            <li onClick={props.onEdit}>Bearbeiten</li>
            <li onClick={props.onRename}>Umbenennen</li>
        </ul>
    );
}

function EditableDivisionInfoView(
    props: {
        division: Readonly<Division>
    }
): JSX.Element {
    const editContext = useContext(ScriptEditContextObj)!;

    const [division, setDivision] = createSignal<Division>(props.division);
    const [isEditing, setIsEditing] = createSignal<boolean>(false);

    const infoComponent = createMemo(() => { 
        const component = (
            <DivisionInfoView division={division()}>
                {
                    isEditing() && (
                        <EditableCueContextObj.Provider value={closeEditor}>
                            <EditCommitView/>
                        </EditableCueContextObj.Provider>
                    )
                }
            </DivisionInfoView>
        ) as ExposedComponent<DivisionInfoComponent>;

        installContextMenuHandler(
            component.infoElement,
            "mouse",
            DivisionEditMenu,
            { onEdit, onRename }
        );

        onMount(() => {
            component.infoElement.addEventListener('contextmenu', toggleMenu as any);
        })

        onCleanup(() => {
            component.infoElement.removeEventListener('contextmenu', toggleMenu as any);
        })

        return component;
    });

    let revoker: (() => void)|undefined;
    const owner = getOwner()!;
    const [content, setContent] = createSignal<string>(props.division.description);

    createEffect(() => {
        const component = infoComponent();
        const editing = isEditing();

        if (editing)
            component.infoElement.classList.add('editing');
        else
            component.infoElement.classList.remove('editing');
    })

    function onRename() {

    }

    function onEdit() {
        if (revoker === undefined) {
            const component = infoComponent();

            revoker = component.injectContent(
                runWithOwner(owner, () =>
                    <Editor content={content()} onChange={setContent} autofocus/>
                )
            );
            setIsEditing(true);
        }
    }

    function closeEditor(res: "dismiss"|"accept") {
        if (revoker !== undefined) {

            revoker();
            setIsEditing(false);

            if (res === "dismiss")
                setContent(division().description);
            else {
                const data = window.structuredClone(division());
                data.description = content();
                setDivision(data);
                editContext.updateDescription(content());
            }

            revoker = undefined;
        }
    }

    return <>{ infoComponent() }</>;
}

interface ScriptEditContext {
    readonly scriptInfo: ScriptInfo;
    updateDescription(newDescription: string): void;
    updateCue(index: number, updater: (p: TextCuePair) => TextCuePair): void;
    insertCue(index: number, newCue: TextCuePair) : void;
}

const ScriptEditContextObj = createContext<ScriptEditContext>();

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

    const script = window.structuredClone(props.script);
    const scriptInfo = computeScriptInfo(script);

    function renderDivision(division: Division, idx: number): JSX.Element {
        const editContext: ScriptEditContext = {
            scriptInfo,
            updateDescription(newDescription) {
                division.description = newDescription;
            },
            updateCue(index: number, updater: (p: TextCuePair) => TextCuePair) {
                const prev = division.textCues[index];
                const next = updater(prev);
                division.textCues[index] = next;
            },
            insertCue(index: number, newCue: TextCuePair) {
                const division = script.divisions[idx];
                division.textCues.splice(
                    index,
                    0,
                    newCue,
                );
                const [, invalidate] = invalidatables[idx];
                invalidate();
            }
        };
        return (
            <div class="script-divsion" data-division={idx}>
                <ScriptEditContextObj.Provider value={editContext}>
                    <h2>{ division.name }</h2>
                    <EditableDivisionInfoView division={division}/>
                    <GapInjectHandle data-index={-1}/>
                    { division.textCues.map(renderCuePair) }
                </ScriptEditContextObj.Provider>
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
