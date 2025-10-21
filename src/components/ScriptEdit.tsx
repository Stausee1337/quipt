import { JSX, createContext, createDeferred, createEffect, createMemo, createSignal, getOwner, onCleanup, onMount, splitProps, useContext, createRoot, runWithOwner, Owner, mapArray, Accessor, For } from 'solid-js';
import { EditorView, minimalSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { placeholder } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Division, Script, TextCue, TextCuePair } from '../schemas';
import { ExposedComponentType, TextCueView, renderCue, renderCuePair as renderCuePairSimple } from './TextCueView';
import { ScriptContextObj } from '../script';
import { DivisionInfoComponent, DivisionInfoView } from './DivisionInfoView';
import { useNavigate, useParams } from '@solidjs/router';
import { insert } from 'solid-js/web';
import { ScriptInfo, computeScriptInfo, pluralize } from './common';
import { ActorPill } from './ActorPill';
import { ExposedComponent } from '../exposed-component';
import { installContextMenuHandler, toggleMenu } from '../popover-menu';
import { DialogManager } from '../dialog';
import { useMutation } from '@tanstack/solid-query';
import { queryClient } from '../client';

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

function DeleteCueDialog(
    props: {
        cuePair: TextCuePair,
        closer: (res: undefined|true) => void
    }
): JSX.Element {

    return (
        <>
            <button class="close" onClick={() => props.closer(undefined)}>
                <i class="bi bi-x"/>
            </button>
            <h3>Einsatz Löschen?</h3>
            <span>Möchten sie diesen Einsatz <strong>unwiederruflich</strong> löschen?</span>
            <div class="single-cue-viewer">
                { renderCuePairSimple(props.cuePair) } 
            </div>
            <div class="bottom-line">
                <button class="secondary-button" onClick={() => props.closer(undefined)}>
                    Abbrechen
                </button>
                <button class="red-button" onClick={() => props.closer(true)}>
                    Löschen
                </button>
            </div>
        </>
    );
}

function EditableTextCue(
    props: {
        index: number,
        cuePair: TextCuePair,
        type: "request"|"response",
    }
): JSX.Element {
    const editContext = useContext(ScriptEditContextObj)!;
    const textCue = createMemo(() => props.cuePair[props.type]);

    const owner = getOwner()!;
    owner.context = { ...owner.context, [EditableCueContextObj.id]: closeEditor };

    // const [textCue, setTextCue] = createSignal<TextCue>(props.textCue ?? { text: null, actors: [] });

    let revoker: (() => void)|undefined;
    const [content, setContent] = createSignal<string>(textCue()?.text ?? '');

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


    const deleteMutation = useMutation(() => ({
        mutationFn: () => editContext.deleteCue(props.index),
        onError(error, variables, onMutateResult, context) {
            console.log(error, variables, onMutateResult, context);
        },
    }))

    const editMutation = useMutation(() => ({
        mutationFn(newCue: TextCue) {
            return editContext.updateCue(
                props.index,
                {
                    ...props.cuePair,
                    [props.type]: newCue
                }
            );
        },
        onError(error, variables, onMutateResult, context) {
            console.log(error, variables, onMutateResult, context);
        },
    }))

    async function onDelete() {
        const res = await DialogManager.openDialog<true>(
            ({closer}) => <DeleteCueDialog 
                cuePair={props.cuePair}
                closer={closer}/>,
            owner
        );
        if (res === undefined) return;
        deleteMutation.mutate();
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
                setContent(textCue()?.text ?? '');
            else {
                const prevTextCue = textCue();
                const newTextCue = {
                    actors: prevTextCue?.actors ?? 
                        editContext.scriptInfo.self !== undefined ? [editContext.scriptInfo.self!] : [],
                    text: content()
                };
                editMutation.mutate(newTextCue);
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

    let handle: HTMLDivElement = undefined!;
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

function renderCuePair(textCuePair: TextCuePair, idx: Accessor<number>): JSX.Element {
    return (
        <>
            <EditableTextCue index={idx()} cuePair={textCuePair} type="request"/>
            <GapInjectHandle static/>
            <EditableTextCue index={idx()} cuePair={textCuePair} type="response"/>
            <GapInjectHandle data-index={idx()}/>
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

        let insertContainer: HTMLDivElement = undefined!;
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
        division: Division
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
    deleteCue(index: number): Promise<{ prev: Script }>;
    insertCue(index: number, newCue: TextCuePair): Promise<{ prev: Script }>;
    updateCue(index: number, newCue: TextCuePair): Promise<{ prev: Script }>;
}

const ScriptEditContextObj = createContext<ScriptEditContext>();

function ScriptCueView(
    props: {
        script: Script
    }
): JSX.Element {
    const scriptContext = useContext(ScriptContextObj)!;

    onMount(() => {
        document.title = `${props.script.name} - Quipt`
    })
    
    createEffect(() => {
        document.title = `${props.script.name} - Quipt`
    })

    const scriptInfo = createMemo(() => computeScriptInfo(props.script));

    function renderDivision(division: Division, idx: Accessor<number>): JSX.Element {
        const editContext: ScriptEditContext = {
            get scriptInfo() {
                return scriptInfo();
            },
            updateDescription(newDescription) {
                division.description = newDescription;
            },
            async updateCue(index, newCuePair) {
                await queryClient.cancelQueries({ queryKey: ['script', props.script.uuid] })
                const prev = queryClient.getQueryData<Script>(['script', props.script.uuid])!;
                queryClient.setQueryData<Script>(['script', props.script.uuid], old => {
                    if (!old) return old;

                    const target = old.divisions[idx()].textCues[index];
                    return {
                        ...old,
                        divisions: Array.from({
                            ...old.divisions,
                            [idx()]: {
                                ...old.divisions[idx()],
                                textCues: old.divisions[idx()].textCues
                                    .map(p => p !== target ? p : newCuePair)
                            },
                            length: old.divisions.length
                        })
                    };
                })
                return { prev };
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
            },
            async deleteCue(index) {
                await queryClient.cancelQueries({ queryKey: ['script', props.script.uuid] })
                const prev = queryClient.getQueryData<Script>(['script', props.script.uuid])!;
                queryClient.setQueryData<Script>(['script', props.script.uuid], old => {
                    if (!old) return old;

                    const toRemove = old.divisions[idx()].textCues[index];
                    return {
                        ...old,
                        divisions: Array.from({
                            ...old.divisions,
                            [idx()]: {
                                ...old.divisions[idx()],
                                textCues: old.divisions[idx()].textCues.filter(p => p !== toRemove)
                            },
                            length: old.divisions.length
                        })
                    };
                })
                return { prev };
            },
        };
        return (
            <div class="script-divsion" id={`division${idx()}`} data-division={idx()}>
                <ScriptEditContextObj.Provider value={editContext}>
                    <h2>{ division.name }</h2>
                    <EditableDivisionInfoView division={division}/>
                    <GapInjectHandle data-index={-1}/>
                    {
                        mapArray(() => division.textCues, renderCuePair) as unknown as JSX.Element
                    }
                </ScriptEditContextObj.Provider>
            </div>
        );
    }

    const [divisionIdx, setDivisionIdx] = createSignal<number>(0);
    
    let contentElement: HTMLDivElement = undefined!;
    const scrollingElement = document.querySelector("div.routing-contents")! as HTMLDivElement;
    function onScroll() {
        const rect = scrollingElement.getBoundingClientRect();
        const element = document.elementFromPoint(
            rect.left + contentElement.offsetWidth / 2,
            rect.top + 10
        );

        let currentElement: Element|null = element;
        while (currentElement !== null) {
            if (currentElement.classList.contains('script-divsion')
                    && (currentElement instanceof HTMLElement)) {
                const divisionIdx = Number(currentElement.dataset.division)
                setDivisionIdx(divisionIdx);
                break;
            }

            currentElement = currentElement.parentElement;
        }
    }

    function jumpToDivision(event: MouseEvent & { currentTarget: HTMLSpanElement }) {
        const target = event.currentTarget;
        const divisionIdx = Number(target.dataset.idx);
        const element = document.getElementById(`division${divisionIdx}`)!;
        scrollingElement.scrollTo({ top: element.offsetTop });
    }

    onMount(() => {
        scrollingElement.addEventListener('scroll', onScroll);
    })

    onCleanup(() => {
        scrollingElement.removeEventListener('scroll', onScroll);
    })

    return (
        <div ref={contentElement} class="desktop-view">
            <div class="readable-content-view">
                <h1 class="script-info">{ props.script.name }</h1>
                <For each={props.script.divisions}>
                    { renderDivision }
                </For>
            </div>
            <div class="grid-layout-filler overview">
                <div class="division-overview">
                    <h4>Info</h4>
                    <section class="script-info">
                        <span class="info">{ pluralize(scriptInfo().textCues, 'Einsatz', 'Einsätze') }</span>
                        <span class="info">{ scriptInfo().actors.join(', ') } Spieler</span>
                    </section>
                    <h4>Abschnitte</h4>
                    <section class="divisions">
                        <ul>
                            {
                                mapArray(() => props.script.divisions, (d, idx) => 
                                    <li classList={{ current: idx() === divisionIdx() }} onClick={jumpToDivision} data-idx={idx()}>
                                        { d.name }
                                    </li>
                                ) as unknown as JSX.Element
                            }
                        </ul>
                    </section>
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
