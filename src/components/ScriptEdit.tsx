import {
    Accessor,
    For,
    JSX,
    children,
    createContext,
    createEffect,
    createMemo,
    createSignal,
    onMount,
    splitProps,
    useContext,
} from 'solid-js';

import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { placeholder } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useLocation, useParams } from '@solidjs/router';
import { useMutation, useQuery } from '@tanstack/solid-query';
import { EditorView, minimalSetup } from 'codemirror';
import { schemas } from 'qrpc-js';

import { AuthenticationContextObj, queryClient } from 'quipt/client';
import { ActorPill as BaseActorPill, PillProps } from 'quipt/components/ActorPill';
import { CreateDivisionInfoView } from 'quipt/components/DivisionInfoView';
import { MakeEditableContent } from 'quipt/components/MakeEditableContent';
import { Popover } from 'quipt/components/Popover';
import { ScriptOverview } from 'quipt/components/ScriptOverview';
import { TrainingRunWrapper } from 'quipt/components/ScriptTraining';
import { TextCueDataView, TextCuePairView } from 'quipt/components/TextCueView';
import {
    ScriptInfo,
    computeScriptInfo,
    formatActorsArray,
    formatMarkdown,
} from 'quipt/components/common';
import { useModal, useModalContext } from 'quipt/modals';
import { Division, Script, TextCue, TextCuePair } from 'quipt/schemas';
import { Button, IconButton } from 'quipt/components/basics';

const myTheme = EditorView.theme({}, { dark: true });

const customMarkdownStyle = HighlightStyle.define([
    // Color for the Markdown formatting markers (e.g., **, _, #)
    {
        tag: tags.processingInstruction,
        color: 'rgb(167.4375, 167.4375, 167.4375)',
    },
    { tag: tags.meta, color: '#ff6b81' },
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
]);

function Editor(props: {
    content?: string;
    onChange?: (content: string) => void;
    autofocus?: boolean;
}): JSX.Element {
    let editorContainer: HTMLDivElement | undefined = undefined;

    let view: EditorView | undefined = undefined;
    onMount(() => {
        view = new EditorView({
            parent: editorContainer,
            doc: props.content,
            extensions: [
                myTheme,
                minimalSetup,
                EditorView.lineWrapping,
                placeholder('Text einfügen ...'),
                markdown(),
                syntaxHighlighting(customMarkdownStyle),
                EditorView.updateListener.of(update => {
                    if (update.docChanged) props.onChange?.(update.state.doc.toString());
                }),
            ],
        });
        if (props.autofocus) setTimeout(() => focusView());
    });

    function focusView() {
        if (view === undefined) return;
        const end = view.state.doc.length;
        view.dispatch({
            selection: { anchor: end, head: end },
            scrollIntoView: true,
        });
        view.focus();
    }

    onMount(() => {});

    return <div ref={editorContainer} class="cm-markdown" />;
}

function EditCommitView(props: { close: (res: 'dismiss' | 'accept') => void }): JSX.Element {
    return (
        <div class="edit-commit-container">
            <IconButton icon="x" onClick={() => props.close('dismiss')} />
            <IconButton icon="check2" onClick={() => props.close('accept')} />
        </div>
    );
}

function TextCueEditMenu(props: { onEdit: () => void; onDelete: () => void }): JSX.Element {
    return (
        <ul class="menu-options">
            <li onClick={props.onDelete}>Löschen</li>
            <li onClick={props.onEdit}>Bearbeiten</li>
        </ul>
    );
}

function DeleteCueModal(props: { cuePair: TextCuePair }): JSX.Element {
    const { dismiss, accept } = useModalContext<void>()!;
    return (
        <>
            <div class="flex items-center">
                <h2 class="text-heading-2">Einsatz Löschen?</h2>
                <IconButton class="ms-auto" icon="x" onClick={dismiss} />
            </div>
            <span>
                Möchten sie diesen Einsatz <strong>unwiederruflich</strong> löschen?
            </span>
            <div class="border-lighter1 bg-accent2 relative flex flex-col gap-6 rounded-lg border p-2">
                <TextCuePairView textCuePair={props.cuePair} />
            </div>
            <div class="flex justify-end gap-2">
                <Button variant="secondary" onClick={dismiss}>
                    Abbrechen
                </Button>
                <Button variant="danger" onClick={accept}>
                    Löschen
                </Button>
            </div>
        </>
    );
}

function EditableTextCueView(props: {
    index: number;
    cuePair: TextCuePair;
    type: 'request' | 'response';
}): JSX.Element {
    const editContext = useContext(ScriptEditContextObj)!;
    const openModal = useModal<void>();
    const textCue = createMemo(() => props.cuePair[props.type]);

    const [content, setContent] = createSignal<string>(textCue()?.text ?? '');
    const [currentActors, setCurrentActors] = createSignal<string[]>(textCue()?.actors ?? []);
    const [isEditing, setIsEditing] = createSignal(false);

    createEffect(() => {
        setContent(textCue()?.text ?? '');
        setCurrentActors(textCue()?.actors ?? []);
    });

    const deleteMutation = useMutation(() => ({
        mutationFn: () => editContext.deleteCue(props.index),
        onError(error, variables, onMutateResult, context) {
            console.log(error, variables, onMutateResult, context);
        },
    }));

    const editMutation = useMutation(() => ({
        mutationFn(newCue: TextCue) {
            return editContext.updateCue(props.index, {
                ...props.cuePair,
                [props.type]: newCue,
            });
        },
        onError(error, variables, onMutateResult, context) {
            console.log(error, variables, onMutateResult, context);
        },
    }));

    async function onDelete() {
        const res = await openModal(() => <DeleteCueModal cuePair={props.cuePair} />);
        if (res.type === 'dismiss') return;
        deleteMutation.mutate();
    }

    function CreateEditCommitView(): JSX.Element {
        return <EditCommitView close={closeEditor} />;
    }

    function CreateActorsSelector(): JSX.Element {
        function actorsChange(newActors: string[]) {
            if (newActors.length === 0) return;
            setCurrentActors(newActors);
        }

        return (
            <ActorsSelector
                self={props.type === 'response' ? editContext.scriptInfo.self : undefined}
                actors={
                    props.type === 'response'
                        ? editContext.scriptInfo.actors
                        : editContext.scriptInfo.actors.filter(
                              s => s !== editContext.scriptInfo.self,
                          )
                }
                selectedActors={currentActors()}
                onSelectionChange={actorsChange}
            />
        );
    }

    function closeEditor(res: 'dismiss' | 'accept') {
        setIsEditing(false);

        const newTextCue = { actors: currentActors(), text: content() };

        if (
            !(newTextCue.actors.length > 0 && newTextCue.text.trim().length > 0) &&
            res === 'accept'
        )
            return;

        if (res === 'dismiss') {
            setContent(textCue()?.text ?? '');
            setCurrentActors(textCue()?.actors ?? []);
            return;
        }

        editMutation.mutate(newTextCue);
    }

    // FIXME: The popover currently applies to the entire cue wrapper, not just the smaller element
    // provided by ref. There might need to be a way to `usePopover` on target element refs in the
    // future.
    return (
        <Popover
            trigger="contextmenu"
            placement="auto"
            content={<TextCueEditMenu onEdit={() => setIsEditing(true)} onDelete={onDelete} />}>
            <TextCueDataView
                type={props.type}
                actorsInfo={formatActorsArray(
                    props.type === 'response' && currentActors().length === 1
                        ? null
                        : currentActors(),
                )}
                text={formatMarkdown(textCue()?.text ?? '_Du bist der erste in diesem Abschnitt_')}
                classList={{ 'ring-2 ring-primary': isEditing() }}
                beforeExtra={isEditing() && <CreateActorsSelector />}
                afterExtra={isEditing() && <CreateEditCommitView />}>
                {isEditing() ? (
                    <Editor content={content()} onChange={setContent} autofocus />
                ) : undefined}
            </TextCueDataView>
        </Popover>
    );
}

function GapInjectHandle(props: { index: number }): JSX.Element {
    const editContext = useContext(ScriptEditContextObj)!;
    const [isInserting, setIsInserting] = createSignal(false);

    const insertMutation = useMutation(() => ({
        mutationFn({ index, newCue }: { index: number; newCue: TextCuePair }) {
            return editContext.insertCue(index, newCue);
        },
    }));

    function insertNewCue(newCue: Omit<TextCuePair, 'previousScores'>) {
        insertMutation.mutate({
            index: props.index,
            newCue: {
                request: newCue.request,
                response: newCue.response,
                previousScores: [],
            },
        });
    }

    return (
        <>
            {!isInserting() ? (
                <div class="contents" onClick={() => setIsInserting(true)}>
                    <div class="hover:text-lighter2 before:border-lighter2 absolute -top-6 left-0 h-6 w-full cursor-pointer text-transparent before:absolute before:top-1/2 before:left-0 before:w-full hover:before:border-b">
                        <i class="bi bi-plus-circle bg-background absolute top-0 left-1/2 -translate-x-1/2 rounded-full" />
                    </div>
                </div>
            ) : (
                <NewCueInserter
                    actors={editContext.scriptInfo.actors}
                    self={editContext.scriptInfo.self}
                    onAccept={insertNewCue}
                    onDismiss={() => setIsInserting(false)}
                />
            )}
        </>
    );
}

function EditableTextCuePairView(props: { textCuePair: TextCuePair; idx: number }): JSX.Element {
    return (
        <div class="relative mt-6 flex flex-col gap-6">
            <GapInjectHandle index={props.idx} />
            <EditableTextCueView index={props.idx} cuePair={props.textCuePair} type="request" />
            <EditableTextCueView index={props.idx} cuePair={props.textCuePair} type="response" />
        </div>
    );
}

function ActorPill(
    props: PillProps & {
        selected?: boolean;
    },
) {
    const [, rest] = splitProps(props, ['selected', 'classList']);

    return (
        <BaseActorPill
            classList={{
                'bg-[var(--actor-color)]/30 outline-[var(--actor-color)]/30 outline-offset-2 outline':
                    props.selected,
                'hover:bg-[var(--actor-color)]/20': !props.selected,
                ...props.classList,
            }}
            {...rest}
        />
    );
}

function ActorsSelector(props: {
    self?: string;
    actors: string[];
    selectedActors: string[];
    onSelectionChange: (selected: string[]) => void;
}): JSX.Element {
    const [newActors, setNewActors] = createSignal<string[]>([]);
    // const [selected, setSelected] = createSignal<string[]>([]);

    function toggleSelection(actor: string) {
        const prev = props.selectedActors;
        const isSelected = !props.selectedActors.includes(actor);

        props.onSelectionChange([
            ...(isSelected ? prev : prev.filter(x => x !== actor)),
            ...(isSelected ? [actor] : []),
        ]);
    }

    function onAddActor(newActor: string) {
        newActor = newActor.trim();
        if (!props.actors.includes(newActor)) setNewActors(prev => [...prev, newActor]);
        props.onSelectionChange([...props.selectedActors, newActor]);
    }

    return (
        <div class={`flex flex-wrap gap-2`}>
            {props.self === undefined ? null : (
                <ActorPill class="pointer-events-none" actorForColor={props.self} selected>
                    Ich
                </ActorPill>
            )}
            {[...props.actors, ...newActors()] // FIXME: Should probably still use <For/>
                .filter(actor => actor !== props.self)
                .map(actor => (
                    <ActorPill
                        class="cursor-pointer"
                        selected={props.selectedActors.includes(actor)}
                        onClick={() => toggleSelection(actor)}>
                        {actor}
                    </ActorPill>
                ))}
            <AddActorButton onAddActor={onAddActor} />
        </div>
    );
}

function AddActorButton(props: { onAddActor: (actor: string) => void }): JSX.Element {
    const [currentContent, setCurrentContent] = createSignal<string>();
    const [isEditing, setIsEditing] = createSignal<boolean>(false);

    // FIXME: use properly configured contenteditable element, instead of dynamically resizing
    // input elements
    const ocanvas = new OffscreenCanvas(1, 1);
    const ctx = ocanvas.getContext('2d')!;
    let spanElement: HTMLSpanElement = undefined!;

    function onContentChange(newText: string) {
        if (newText.trim().length === 0) setCurrentContent(undefined);
        else setCurrentContent(newText);

        const inputElement = spanElement.querySelector('input')! as HTMLInputElement;

        const computedStyle = window.getComputedStyle(spanElement);
        const { fontStyle, fontVariant, fontWeight, fontSize, lineHeight, fontFamily } =
            computedStyle;
        ctx.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;

        const textMetrics = ctx.measureText(newText);
        inputElement.style.setProperty('--text-width', `${textMetrics.width}px`);
    }

    function editDone() {
        setIsEditing(false);
        const newName = currentContent();
        if (newName === undefined) return;
        setCurrentContent(undefined);
        props.onAddActor(newName);
    }

    return (
        <MakeEditableContent
            component={ActorPill}
            isEditable={isEditing()}
            onContentChange={onContentChange}
            onEditEnd={editDone}

            ref={spanElement}
            onClick={!isEditing() ? () => setIsEditing(true) : undefined}
            actorForColor={currentContent()}
            extra="+"
            children=""
        />
    );
}

function NewTextCueView(props: {
    type: 'request' | 'response';
    actors: string[];
    self?: string;
    onChange: (cue: TextCue) => void;
}): JSX.Element {
    const [selectedActors, setSelectedActors] = createSignal<string[]>([]);
    const [content, setContent] = createSignal<string>('');

    createEffect(() => {
        props.onChange({
            text: content(),
            actors: props.self === undefined ? selectedActors() : [...selectedActors(), props.self],
        });
    });

    function CreateActorsSelector(): JSX.Element {
        return (
            <ActorsSelector
                self={props.self}
                actors={props.actors}
                selectedActors={selectedActors()}
                onSelectionChange={setSelectedActors}
            />
        );
    }

    return (
        <TextCueDataView
            type={props.type}
            actorsInfo={null}
            text={[]}
            beforeExtra={<CreateActorsSelector />}>
            <Editor
                content={content()}
                onChange={setContent}
                autofocus={props.type === 'request'}
            />
        </TextCueDataView>
    );
}

function NewCueInserter(props: {
    self: string | undefined;
    actors: string[];
    onAccept: (newCue: Omit<TextCuePair, 'previousScores'>) => void;
    onDismiss: () => void;
}): JSX.Element {
    const [request, setRequest] = createSignal<TextCue>({
        text: '',
        actors: [],
    });
    const [response, setResponse] = createSignal<TextCue>({
        text: '',
        actors: props.self === undefined ? [] : [props.self],
    });

    const isValidCue = (cue: TextCue) => cue.actors.length > 0 && cue.text.length > 0;

    const isValid = createMemo(() => {
        return isValidCue(request()) && isValidCue(response());
    });

    function buildCuePair() {
        return {
            request: request(),
            response: response(),
        };
    }

    return (
        <div class="bg-accent2 border-lighter1 relative -left-2 z-2 my-3 flex w-[calc(100%)+var(--spacing)*4] flex-col gap-6 rounded-lg border p-2">
            <NewTextCueView
                type="request"
                onChange={setRequest}
                actors={props.actors.filter(a => a !== props.self)}
            />
            <NewTextCueView
                type="response"
                onChange={setResponse}
                actors={props.actors}
                self={props.self}
            />
            <div class="flex justify-end gap-2">
                <Button variant="secondary" onClick={props.onDismiss}>
                    Abbrechen
                </Button>
                <Button
                    variant="primary"
                    disabled={!isValid()}
                    onClick={() => props.onAccept(buildCuePair())}>
                    Hinzufügen
                </Button>
            </div>
        </div>
    );
}

function DivisionEditMenu(props: { onEdit: () => void; onRename: () => void }): JSX.Element {
    return (
        <ul class="menu-options">
            <li onClick={props.onEdit}>Bearbeiten</li>
            <li onClick={props.onRename}>Umbenennen</li>
        </ul>
    );
}

function EditableDivisionInfoView(props: {
    division: Division;
    onRename: () => void;
}): JSX.Element {
    const editContext = useContext(ScriptEditContextObj)!;
    const [isEditing, setIsEditing] = createSignal<boolean>(false);
    let infoElement: HTMLDivElement | undefined = undefined;

    // TODO: what exactly is this contraption?
    const [currentContent, setCurrentContent] = createSignal<string>(props.division.description);

    const descriptionMutation = useMutation(() => ({
        mutationFn: editContext.updateDescription,
    }));

    function closeEditor(res: 'dismiss' | 'accept') {
        if (isEditing()) {
            setIsEditing(false);

            if (res === 'dismiss') setCurrentContent(props.division.description);
            else {
                descriptionMutation.mutate(currentContent());
            }
        }
    }

    return (
        <Popover
            trigger="contextmenu"
            placement="auto"
            content={
                <DivisionEditMenu onEdit={() => setIsEditing(true)} onRename={props.onRename} />
            }>
            <CreateDivisionInfoView
                division={props.division}
                classList={{ editing: isEditing() }}
                external={
                    isEditing() ? (
                        <Editor
                            content={props.division.description}
                            onChange={setCurrentContent}
                            autofocus
                        />
                    ) : undefined
                }
                ref={infoElement}>
                {isEditing() && <EditCommitView close={closeEditor} />}
            </CreateDivisionInfoView>
        </Popover>
    );
}

function HeadingWithEditButton(
    props: {
        children: JSX.Element;
        onEditClick: () => void;
    } & JSX.HTMLAttributes<HTMLHeadingElement>,
): JSX.Element {
    const [_, rest] = splitProps(props, ['children', 'onEditClick']);
    const getChildren = children(() => props.children);
    const isSimpleContent = createMemo(() => typeof getChildren() === 'string');

    return (
        <h2 class="text-heading-2 top-0 py-2 text-center" {...rest}>
            {props.children}
            {isSimpleContent() && (
                <IconButton icon="pencil" class="text-lighter2" onClick={props.onEditClick} />
            )}
        </h2>
    );
}

function DivisionView(props: { division: Division; idx: number }): JSX.Element {
    const editContext = useContext(ScriptEditContextObj)!;

    const [isEditing, setIsEditing] = createSignal<boolean>(false);

    // FIXME: Is this really the best we can do here?
    //        Lets come back and clearly state the goal of this contraption
    const [currentName, setCurrentName] = createSignal<string>(props.division.name);
    createEffect(() => setCurrentName(props.division.name));

    const renameMutation = useMutation(() => ({
        mutationFn: editContext.renameDivision,
    }));

    function onRename() {
        setIsEditing(true);
    }

    function onRenameDone() {
        setIsEditing(false);
        const newName = currentName();
        if (newName === props.division.name || newName.length === 0) return;
        renameMutation.mutate(newName);
    }

    return (
        <div class="flex flex-col">
            <MakeEditableContent
                component={HeadingWithEditButton}
                isEditable={isEditing()}
                onContentChange={setCurrentName}
                onEditEnd={onRenameDone}

                onEditClick={onRename}>
                {currentName()}
            </MakeEditableContent>
            <EditableDivisionInfoView division={props.division} onRename={onRename} />
            <For each={props.division.textCues}>
                {(pair, idx) => <EditableTextCuePairView textCuePair={pair} idx={idx()} />}
            </For>
        </div>
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

function ScriptView(props: { scriptID: schemas.UUID }): JSX.Element {
    const authContext = useContext(AuthenticationContextObj)!;
    const scriptQuery = useQuery<Script>(() => ({ queryKey: ['script', props.scriptID] }));
    const script = createMemo(() => scriptQuery.data!);

    createEffect(() => {
        document.title = `${script().name} - Quipt`;
    });

    const scriptInfo = createMemo(() => computeScriptInfo(script()));
    function createScriptEditContext(idx: Accessor<number>): ScriptEditContext {
        return {
            get scriptInfo() {
                return scriptInfo();
            },
            async renameDivision(newName) {
                await queryClient.cancelQueries({
                    queryKey: ['script', script().uuid],
                });
                const prev = queryClient.getQueryData<Script>(['script', script().uuid])!;

                queryClient.setQueryData<Script>(['script', script().uuid], old => {
                    if (!old) return old;

                    return {
                        ...old,
                        divisions: Array.from({
                            ...old.divisions,
                            [idx()]: {
                                ...old.divisions[idx()],
                                name: newName,
                            },
                            length: old.divisions.length,
                        }),
                    };
                });

                await authContext.services!.division.rename({
                    scriptId: script().uuid,
                    divisionIdx: idx(),
                    name: newName,
                });
                return { prev };
            },
            async updateDescription(newDescription) {
                await queryClient.cancelQueries({
                    queryKey: ['script', script().uuid],
                });
                const prev = queryClient.getQueryData<Script>(['script', script().uuid])!;
                queryClient.setQueryData<Script>(['script', script().uuid], old => {
                    if (!old) return old;

                    return {
                        ...old,
                        divisions: Array.from({
                            ...old.divisions,
                            [idx()]: {
                                ...old.divisions[idx()],
                                description: newDescription,
                            },
                            length: old.divisions.length,
                        }),
                    };
                });
                await authContext.services!.division.updateDescription({
                    scriptId: script().uuid,
                    divisionIdx: idx(),
                    description: newDescription,
                });
                return { prev };
            },
            async updateCue(index, newCuePair) {
                await queryClient.cancelQueries({
                    queryKey: ['script', script().uuid],
                });
                const prev = queryClient.getQueryData<Script>(['script', script().uuid])!;
                queryClient.setQueryData<Script>(['script', script().uuid], old => {
                    if (!old) return old;

                    const target = old.divisions[idx()].textCues[index];
                    return {
                        ...old,
                        divisions: Array.from({
                            ...old.divisions,
                            [idx()]: {
                                ...old.divisions[idx()],
                                textCues: old.divisions[idx()].textCues.map(p =>
                                    p !== target ? p : newCuePair,
                                ),
                            },
                            length: old.divisions.length,
                        }),
                    };
                });
                await authContext.services!.cue.update({
                    uuid: script().uuid,
                    divisionIdx: idx(),
                    cueIdx: index,
                    newCue: newCuePair,
                });
                return { prev };
            },
            async insertCue(index, newCue) {
                await queryClient.cancelQueries({
                    queryKey: ['script', script().uuid],
                });
                const prev = queryClient.getQueryData<Script>(['script', script().uuid])!;
                queryClient.setQueryData<Script>(['script', script().uuid], old => {
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
                                ],
                            },
                            length: old.divisions.length,
                        }),
                    };
                });
                await authContext.services!.cue.insert({
                    uuid: script().uuid,
                    divisionIdx: idx(),
                    cueIdx: index,
                    cue: newCue,
                });
                return { prev };
            },
            async deleteCue(index) {
                await queryClient.cancelQueries({
                    queryKey: ['script', script().uuid],
                });
                const prev = queryClient.getQueryData<Script>(['script', script().uuid])!;
                queryClient.setQueryData<Script>(['script', script().uuid], old => {
                    if (!old) return old;

                    const toRemove = old.divisions[idx()].textCues[index];
                    return {
                        ...old,
                        divisions: Array.from({
                            ...old.divisions,
                            [idx()]: {
                                ...old.divisions[idx()],
                                textCues: old.divisions[idx()].textCues.filter(p => p !== toRemove),
                            },
                            length: old.divisions.length,
                        }),
                    };
                });
                await authContext.services!.cue.delete({
                    uuid: script().uuid,
                    divisionIdx: idx(),
                    cueIdx: index,
                });
                return { prev };
            },
        };
    }

    return (
        <>
            <div class="max-w-250 select-none">
                <For each={script().divisions}>
                    {(division, idx) => (
                        <ScriptEditContextObj.Provider value={createScriptEditContext(idx)}>
                            <DivisionView division={division} idx={idx()} />
                        </ScriptEditContextObj.Provider>
                    )}
                </For>
            </div>
        </>
    );
}

export function ScriptPage(props: { scriptID: schemas.UUID }): JSX.Element {
    const location = useLocation();
    const params = useParams();

    const currentRoute = createMemo(() => {
        if (location.pathname.startsWith('/train')) return 'train';
        return 'view';
    });

    return (
        <div class="flex justify-center gap-8 p-4">
            {currentRoute() === 'view' ? (
                <ScriptView scriptID={props.scriptID} />
            ) : (
                // FIXME: params.division is absolutely not enforced (existance and validtiy) and
                // using params directly isn't exactly a great source of truth
                <TrainingRunWrapper
                    scriptID={props.scriptID}
                    divisionIdx={parseInt(params.division!) - 1}
                />
            )}
            <div>
                <div class="bg-accent1 sticky top-4 h-[calc(100cqh-var(--spacing)*8)] w-120 max-w-120 min-w-90">
                    <ScriptOverview scriptID={props.scriptID} />
                </div>
            </div>
        </div>
    );
}
