import { JSX, createContext, createEffect, createMemo, createSignal, getOwner, onCleanup, onMount, splitProps, useContext, createRoot, runWithOwner, indexArray, mapArray, Owner, Accessor, children } from 'solid-js';
import { EditorView, minimalSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { placeholder } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Division, Script, TextCue, TextCuePair } from '../schemas';
import { ExposedComponentType, TextCueView, renderCuePair as renderCuePairSimple } from './TextCueView';
import { ScriptContextObj } from '../script';
import { DivisionInfoComponent, DivisionInfoView } from './DivisionInfoView';
import { useNavigate, useParams } from '@solidjs/router';
import { Dynamic, insert } from 'solid-js/web';
import { ScriptInfo, computeScriptInfo, formatActorsArray, formatMarkdown, pluralize } from './common';
import { ActorPill } from './ActorPill';
import { ExposedComponent } from '../exposed-component';
import { installPopoverMenuHandler, contextMenu } from '../popover-menu';
import { DialogManager } from '../dialog';
import { useMutation } from '@tanstack/solid-query';
import { AuthenticationContextObj, queryClient } from '../client';
import { MakeEditableContent } from './MakeEditableContent';

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

function EditCommitView(props: { close: (res: "dismiss"|"accept") => void }): JSX.Element {
    return (
        <div class="edit-commit-container">
            <button class="icon-button" onClick={() => props.close("dismiss")}>
                &#xF62A;
            </button>
            <button class="icon-button" onClick={() => props.close("accept")}>
                &#xF272;
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

    let revoker: ((res: TextCue|undefined) => void)|undefined;
    const [content, setContent] = createSignal<string>(textCue()?.text ?? '');
    const [currentActors, setCurrentActors] = createSignal<string[]>(textCue()?.actors ?? []);

    createEffect(() => {
        setContent(textCue()?.text ?? '');
        setCurrentActors(textCue()?.actors ?? []);
    })

    const cueComponent = <TextCueView
        type={props.type}
        actorsInfo={
            formatActorsArray((props.type === "response" && currentActors().length === 1) ? null : currentActors())
        }
        text={formatMarkdown(textCue()?.text ?? '_Du bist der erste in diesem Abschnitt_')}/> as ExposedComponentType;

    installPopoverMenuHandler(
        cueComponent.cueElement,
        "auto",
        CueEditMenu,
        { onEdit, onDelete }
    );

    onMount(() => {
        cueComponent.cueElement.addEventListener('contextmenu', contextMenu);
    })

    onCleanup(() => {
        cueComponent.cueElement.removeEventListener('contextmenu', contextMenu);
    })

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

    function createAsyncEditor(): Promise<TextCue|undefined> {
        if (revoker !== undefined)
            return Promise.resolve(undefined);

        let resolve: (x: TextCue|undefined) => void;
        let promise = new Promise<TextCue|undefined>(resolve1 => resolve = resolve1);

        cueComponent.cueElement.classList.add('editing');
        const revoker1 = cueComponent.injectContent(
            runWithOwner(owner, () =>
                <Editor content={content()} onChange={setContent} autofocus/>
            )
        )!;
        cueComponent.addExtension(CreateEditCommitView);
        cueComponent.addExtension(CreateActorsSelector, "before");

        revoker = res => {
            revoker1();
            resolve(res);
        };

        return promise;
    }

    async function onEdit() {
        const editorResult = await createAsyncEditor();
        if (editorResult === undefined) {
            setContent(textCue()?.text ?? '');
            setCurrentActors(textCue()?.actors ?? []);
            return;
        }
        editMutation.mutate(editorResult);
    }

    function CreateEditCommitView(): JSX.Element {
        return <EditCommitView close={closeEditor}/>;
    }

    function CreateActorsSelector(): JSX.Element {
        function actorsChange(newActors: string[]) {
            if (newActors.length === 0) return;
            setCurrentActors(newActors);
        }

        return (
            <ActorsSelector
                self={props.type === "response" ? editContext.scriptInfo.self : undefined}
                actors={
                    props.type === "response"
                        ? editContext.scriptInfo.actors
                        : editContext.scriptInfo.actors.filter(s => s !== editContext.scriptInfo.self)
                }
                selectedActors={currentActors()}
                onSelectionChange={actorsChange}/>
        );
    }

    function closeEditor(res: "dismiss"|"accept") {
        if (revoker !== undefined) {
            const newTextCue = { actors: currentActors(), text: content() };

            if (!(newTextCue.actors.length > 0 && newTextCue.text.trim().length > 0) && res === "accept")
                return;

            cueComponent.cueElement.classList.remove('editing');
            cueComponent.removeExtension(CreateEditCommitView);
            cueComponent.removeExtension(CreateActorsSelector);

            if (res === "dismiss")
                revoker(undefined);
            else
                revoker(newTextCue);

            revoker = undefined;
        }
    }

    return <>{ cueComponent }</>;
}

function GapInjectHandle(
    props: { static?: boolean } & JSX.HTMLAttributes<HTMLDivElement>
): JSX.Element {
    const owner = getOwner();
    const editContext = useContext(ScriptEditContextObj)!;
    const [, rest] = splitProps(props, [
        "static", "classList", "style", "children"
    ]);

    const insertMutation = useMutation(() => ({
        mutationFn({ index, newCue }: { index: number, newCue: TextCuePair }) {
            return editContext.insertCue(index, newCue);
        }
    }))

    let handle: HTMLDivElement = undefined!;
    async function onClick() {
        const newCue = await createCueInserter(handle, editContext.scriptInfo, owner);
        if (newCue === undefined) return;

        insertMutation.mutate({
            index: newCue.index,
            newCue: { 
                request: newCue.request,
                response: newCue.response,
                previousScores: []
            }
        });
    }

    return (
        <div ref={handle} class="gap-inject-handle" onClick={onClick} classList={{ static: props.static }} {...rest}>
            { props.static ? null : <i class="bi bi-plus-circle"/> }
        </div>
    );
}

function renderCuePair(textCuePair: Accessor<TextCuePair>, idx: number): JSX.Element {
    return (
        <>
            <EditableTextCue index={idx} cuePair={textCuePair()} type="request"/>
            <GapInjectHandle static/>
            <EditableTextCue index={idx} cuePair={textCuePair()} type="response"/>
            <GapInjectHandle data-index={idx}/>
        </>
    )
}

function ActorsSelector(
    props: {
        self?: string,
        actors: string[],
        selectedActors: string[],
        onSelectionChange: (selected: string[]) => void
    }
): JSX.Element {
    const [newActors, setNewActors] = createSignal<string[]>([]);
    // const [selected, setSelected] = createSignal<string[]>([]);

    function toggleSelection(actor: string) {
        const prev = props.selectedActors;
        const isSelected = !props.selectedActors.includes(actor);

        props.onSelectionChange([
            ...(isSelected ? prev : prev.filter(x => x !== actor)),
            ...(isSelected ? [actor] : [])
        ])
    }

    function onAddActor(newActor: string) {
        newActor = newActor.trim();
        if (!props.actors.includes(newActor))
            setNewActors(prev => [...prev, newActor])
        props.onSelectionChange([
            ...props.selectedActors,
            newActor,
        ])
    }
 
    return (
        <div class="actors-selector">
            {
                props.self === undefined ? null : (
                    <ActorPill
                        actorForColor={props.self}
                        classList={{ selected: true }}
                        static>
                        Ich
                    </ActorPill>
                )
            }
            {
                [...props.actors, ...newActors()]
                    .filter(actor => actor !== props.self)
                    .map(
                        actor => (
                            <ActorPill
                                classList={{'selected': props.selectedActors.includes(actor)}}
                                onClick={() => toggleSelection(actor)}>
                                {actor}
                            </ActorPill>
                        )
                    )
            }
            <AddActorButton onAddActor={onAddActor}/>
        </div>
    );
}

function AddActorButton(
    props: {
        onAddActor: (actor: string) => void
    }
): JSX.Element {
    const [currentContent, setCurrentContent] = createSignal<string>();
    const [isEditing, setIsEditing] = createSignal<boolean>(false);

    const ocanvas = new OffscreenCanvas(1, 1);
    const ctx = ocanvas.getContext("2d")!;
    let spanElement: HTMLSpanElement = undefined!;

    function onContentChange(newText: string) {
        if (newText.trim().length === 0)
            setCurrentContent(undefined);
        else
            setCurrentContent(newText);

        const inputElement = spanElement.querySelector('input')! as HTMLInputElement;
            
        const computedStyle = window.getComputedStyle(spanElement);
        const { fontStyle, fontVariant, fontWeight, fontSize, lineHeight, fontFamily } = computedStyle; 
        ctx.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;

        const textMetrics = ctx.measureText(newText);
        inputElement.style.setProperty('--text-width', `${textMetrics.width}px`);
    }

    function editDone() {
        setIsEditing(false);
        const newName = currentContent();
        if (newName === undefined)
            return;
        setCurrentContent(undefined);
        props.onAddActor(newName);
    }

    return (
        <MakeEditableContent component={ActorPill}
            isEditable={isEditing()}
            onContentChange={onContentChange}
            onEditEnd={editDone}

            ref={spanElement}
            onClick={!isEditing() ? (() => setIsEditing(true)) : undefined}
            actorForColor={currentContent()}
            extra="+"
            children=""/>
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
                           selectedActors={selectedActors()}
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
                divisionElement.insertBefore(handle, insertContainer);
                insertContainer.remove();
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
        division: Division,
        onRename: () => void
    }
): JSX.Element {
    const editContext = useContext(ScriptEditContextObj)!;

    const [isEditing, setIsEditing] = createSignal<boolean>(false);

    const infoComponent = createMemo(() => { 
        const component = (
            <DivisionInfoView division={props.division}>
                {
                    isEditing() && (
                        <EditCommitView close={closeEditor}/>
                    )
                }
            </DivisionInfoView>
        ) as ExposedComponent<DivisionInfoComponent>;

        installPopoverMenuHandler(
            component.infoElement,
            "auto",
            DivisionEditMenu,
            { 
                onEdit, 
                get onRename() {
                    return props.onRename;
                }
            }
        );

        onMount(() => {
            component.infoElement.addEventListener('contextmenu', contextMenu);
        })

        onCleanup(() => {
            component.infoElement.removeEventListener('contextmenu', contextMenu);
        })

        return component;
    });

    let revoker: (() => void)|undefined;
    const owner = getOwner()!;
    const description = createMemo(() => props.division.description);

    const [currentContent, setCurrentContent] = createSignal<string>(description());

    createEffect(() => {
        const component = infoComponent();
        const editing = isEditing();

        if (editing)
            component.infoElement.classList.add('editing');
        else
            component.infoElement.classList.remove('editing');
    })

    function onEdit() {
        if (revoker === undefined) {
            const component = infoComponent();

            revoker = component.injectContent(
                runWithOwner(owner, () =>
                    <Editor content={description()} onChange={setCurrentContent} autofocus/>
                )
            );
            setIsEditing(true);
        }
    }

    const descriptionMutation = useMutation(() => ({
        mutationFn: editContext.updateDescription
    }));

    function closeEditor(res: "dismiss"|"accept") {
        if (revoker !== undefined) {

            revoker();
            setIsEditing(false);

            if (res === "dismiss")
                setCurrentContent(description());
            else {
                descriptionMutation.mutate(currentContent());
            }

            revoker = undefined;
        }
    }

    return <>{ infoComponent() }</>;
}

function HeadingWithEditButton(
    props: {
        children: JSX.Element,
        headingSize: 1|2|3|4|5|6,
        onEditClick: () => void
    } & JSX.HTMLAttributes<HTMLHeadingElement>
): JSX.Element {
    const [_, rest] = splitProps(props, ["children", "headingSize", "onEditClick"]);
    const getChildren = children(() => props.children);
    const isSimpleContent = createMemo(() => typeof getChildren() === "string")

    return (
        <Dynamic component={`h${props.headingSize}`} {...rest}>
            { props.children }
            {
                isSimpleContent() && (
                    <button class="icon-button" onClick={() => props.onEditClick()}>
                        &#xF4CB;
                    </button>
                )
            }
        </Dynamic>
    );
}

interface ScriptEditContext {
    readonly scriptInfo: ScriptInfo;
    updateDescription(newDescription: string): Promise<{ prev: Script }>;
    renameDivision(newName: string): Promise<{ prev: Script }>;
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
    const authContext = useContext(AuthenticationContextObj)!;

    onMount(() => {
        document.title = `${props.script.name} - Quipt`
    })
    
    createEffect(() => {
        document.title = `${props.script.name} - Quipt`
    })

    const scriptInfo = createMemo(() => computeScriptInfo(props.script));

    function renderDivision(division: Accessor<Division>, index: number): JSX.Element {
        const idx = () => index;

        const editContext: ScriptEditContext = {
            get scriptInfo() {
                return scriptInfo();
            },
            async renameDivision(newName) {
                await queryClient.cancelQueries({ queryKey: ['script', props.script.uuid] })
                const prev = queryClient.getQueryData<Script>(['script', props.script.uuid])!;

                queryClient.setQueryData<Script>(['script', props.script.uuid], old => {
                    if (!old) return old;

                    return {
                        ...old,
                        divisions: Array.from({
                            ...old.divisions,
                            [idx()]: {
                                ...old.divisions[idx()],
                                name: newName
                            },
                            length: old.divisions.length
                        })
                    };
                });

                await authContext.services!.division.rename({
                    scriptId: props.script.uuid,
                    divisionIdx: idx(),
                    name: newName
                });
                return { prev };
            },
            async updateDescription(newDescription) {
                await queryClient.cancelQueries({ queryKey: ['script', props.script.uuid] })
                const prev = queryClient.getQueryData<Script>(['script', props.script.uuid])!;
                queryClient.setQueryData<Script>(['script', props.script.uuid], old => {
                    if (!old) return old;

                    return {
                        ...old,
                        divisions: Array.from({
                            ...old.divisions,
                            [idx()]: {
                                ...old.divisions[idx()],
                                description: newDescription
                            },
                            length: old.divisions.length
                        })
                    };
                });
                await authContext.services!.division.updateDescription({
                    scriptId: props.script.uuid,
                    divisionIdx: idx(),
                    description: newDescription
                });
                return { prev };
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
                await authContext.services!.cue.update({
                    uuid: props.script.uuid,
                    divisionIdx: idx(),
                    cueIdx: index,
                    newCue: newCuePair
                });
                return { prev };
            },
            async insertCue(index, newCue) {
                await queryClient.cancelQueries({ queryKey: ['script', props.script.uuid] })
                const prev = queryClient.getQueryData<Script>(['script', props.script.uuid])!;
                queryClient.setQueryData<Script>(['script', props.script.uuid], old => {
                    if (!old) return old;

                    const textCues = old.divisions[idx()].textCues;
                    return {
                        ...old,
                        divisions: Array.from({
                            ...old.divisions,
                            [idx()]: {
                                ...old.divisions[idx()],
                                textCues: [
                                    ...textCues.slice(0, index),
                                    newCue,
                                    ...textCues.slice(index),
                                ]
                            },
                            length: old.divisions.length
                        })
                    };
                })
                await authContext.services!.cue.insert({
                    uuid: props.script.uuid,
                    divisionIdx: idx(),
                    cueIdx: index,
                    cue: newCue
                });
                return { prev };
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
                await authContext.services!.cue.delete({
                    uuid: props.script.uuid,
                    divisionIdx: idx(),
                    cueIdx: index,
                });
                return { prev };
            },
        };

        const [isEditing, setIsEditing] = createSignal<boolean>(false);
        const [currentName, setCurrentName] = createSignal<string>(division().name);

        createEffect(() => setCurrentName(division().name))
        const renameMutation = useMutation(() => ({
            mutationFn: editContext.renameDivision 
        }))

        function onRename() {
            setIsEditing(true);
        }

        function onRenameDone() {
            setIsEditing(false);
            const newName = currentName();
            if (newName === division().name || newName.length === 0)
                return
            renameMutation.mutate(newName);
        }

        return (
            <div class="script-divsion" id={`division${idx()}`} data-division={idx()}>
                <ScriptEditContextObj.Provider value={editContext}>
                    <MakeEditableContent component={HeadingWithEditButton}
                        isEditable={isEditing()}
                        onContentChange={setCurrentName}
                        onEditEnd={onRenameDone}

                        headingSize={2}
                        onEditClick={onRename}>
                        { currentName() }
                    </MakeEditableContent>
                    <EditableDivisionInfoView division={division()} onRename={onRename}/>
                    <GapInjectHandle data-index={-1}/>
                    {
                        indexArray(() => division().textCues, renderCuePair) as unknown as JSX.Element
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

    const [isEditing, setIsEditing] = createSignal<boolean>(false);
    const [currentName, setCurrentName] = createSignal<string>(props.script.name);
    const renameMutation = useMutation(() => ({
        mutationFn(newName: string) {
            return scriptContext.renameScript(props.script.uuid, newName);
        }
    }))

    createEffect(() => {
        setCurrentName(props.script.name)
    })

    function onRenameDone() {
        setIsEditing(false);
        const newName = currentName();
        if (newName === props.script.name || newName.length === 0)
            return
        renameMutation.mutate(newName);
    }

    return (
        <div ref={contentElement} class="desktop-view">
            <div class="readable-content-view">
                <MakeEditableContent component={HeadingWithEditButton}
                    isEditable={isEditing()}
                    onContentChange={setCurrentName}
                    onEditEnd={onRenameDone}

                    class="script-info"
                    headingSize={1}
                    onEditClick={() => setIsEditing(true)}>
                    { currentName() }
                </MakeEditableContent>
                {
                    indexArray(() => props.script.divisions, renderDivision) as unknown as JSX.Element
                }
            </div>
            <div class="grid-layout-filler overview">
                <div class="division-overview">
                    <h4>Info</h4>
                    <section class="script-info">
                        <span class="info">{ pluralize(scriptInfo().textCues, 'Einsatz', 'Einsätze') }</span>
                        <span class="info">{ scriptInfo().actors.join(', ') }</span>
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
