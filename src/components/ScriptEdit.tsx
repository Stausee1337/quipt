import {
    ComponentProps,
    JSX,
    ReactNode,
    createContext,
    useEffect,
    useMemo,
    useState,
    useContext,
    useRef,
} from 'quipt/rexport';

import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { placeholder } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { EditorView, minimalSetup } from 'codemirror';
import { schemas } from 'qrpc-js';
import classnames from 'classnames';

import { AuthenticationContextObj } from 'quipt/client';
import { ActorPill as BaseActorPill, PillProps } from 'quipt/components/ActorPill';
import { CreateDivisionInfoView } from 'quipt/components/DivisionInfoView';
import { MakeEditableContent } from 'quipt/components/MakeEditableContent';
import { Popover, PopoverMenuItem } from 'quipt/components/Popover';
import { ScriptOverview } from 'quipt/components/ScriptOverview';
import { TrainingRunWrapper } from 'quipt/components/ScriptTraining';
import { TextCueDataView, TextCuePairView } from 'quipt/components/TextCueView';
import {
    ScriptInfo,
    computeScriptInfo,
    formatActorsArray,
    formatMarkdown,
} from 'quipt/components/common';
import { Modal, useModal, useModalContext } from 'quipt/modals';
import { Division, TextCue, TextCuePair } from 'quipt/schemas';
import { Button, IconButton, ScrollContainer } from 'quipt/components/basics';
import { useBreakpoints } from 'quipt/responsive';
import { scriptQueryOptions, useCreateCue, useDeleteCue, useRenameDivision, useScriptParams, useUpdateCue, useUpdateDivisionDescription } from 'quipt/script';

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
    const editorContainer = useRef<HTMLDivElement>(null);

    const view = useRef<EditorView>(null);
    useEffect(() => {
        if (editorContainer.current === null || view.current !== null) return;
        view.current = new EditorView({
            parent: editorContainer.current,
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
    }, [editorContainer.current]);

    function focusView() {
        if (view.current === null) return;
        const end = view.current.state.doc.length;
        view.current.dispatch({
            selection: { anchor: end, head: end },
            scrollIntoView: true,
        });
        view.current.focus();
    }

    return <div ref={editorContainer} className="cm-markdown" />;
}

function EditCommitView(props: { close: (res: 'dismiss' | 'accept') => void }): JSX.Element {
    return (
        <div className="edit-commit-container">
            <IconButton icon="x" onClick={() => props.close('dismiss')} />
            <IconButton icon="check2" onClick={() => props.close('accept')} />
        </div>
    );
}

function TextCueEditMenu(props: { onEdit: () => void; onDelete: () => void }): JSX.Element {
    return (
        <>
            <PopoverMenuItem onClick={props.onDelete}>Löschen</PopoverMenuItem>
            <PopoverMenuItem onClick={props.onEdit}>Bearbeiten</PopoverMenuItem>
        </>
    );
}

function DeleteCueModal(props: { cuePair: TextCuePair }): JSX.Element {
    const { dismiss, accept } = useModalContext<void>()!;
    return (
        <>
            <div className="flex items-center">
                <h2 className="text-heading-2">Einsatz Löschen?</h2>
                <IconButton className="ms-auto" icon="x" onClick={dismiss} />
            </div>
            <span>
                Möchten sie diesen Einsatz <strong>unwiederruflich</strong> löschen?
            </span>
            <div className="border-lighter1 bg-accent2 relative flex flex-col gap-6 rounded-lg border p-2">
                <TextCuePairView textCuePair={props.cuePair} />
            </div>
            <div className="flex justify-end gap-2">
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

function CreateActorsSelector({
    type,
    actors,
    onActorsChange,
}: {
    type: 'request' | 'response',
    actors: string[],
    onActorsChange: (actors: string[]) => void;
}): JSX.Element {
    const editContext = useContext(DivisionContextObj)!;
    function actorsChange(newActors: string[]) {
        if (newActors.length === 0) return;
        onActorsChange(newActors);
    }

    return (
        <ActorsSelector
            self={type === 'response' ? editContext.scriptInfo.self : undefined}
            actors={
                type === 'response'
                    ? editContext.scriptInfo.actors
                    : editContext.scriptInfo.actors.filter(
                          s => s !== editContext.scriptInfo.self,
                      )
            }
            selectedActors={actors}
            onSelectionChange={actorsChange}
        />
    );
}

function EditableTextCueView({
    cueIdx,
    cuePair,
    type,
}: {
    cueIdx: number;
    cuePair: TextCuePair;
    type: 'request' | 'response';
}): JSX.Element {
    const editContext = useContext(DivisionContextObj)!;
    const [modalContext, openModal] = useModal<void>();
    const textCue = cuePair[type];

    const [content, setContent] = useState<string>(textCue?.text ?? '');
    const [currentActors, setCurrentActors] = useState<string[]>(textCue?.actors ?? []);
    const [isEditing, setIsEditing] = useState(false);

    const deleteMutation = useDeleteCue();
    const updateMutation = useUpdateCue();

    useEffect(() => {
        setContent(textCue?.text ?? '');
        setCurrentActors(textCue?.actors ?? []);
    }, [textCue]);


    async function onDelete() {
        const res = await openModal(<DeleteCueModal cuePair={cuePair} />);
        if (res.type === 'dismiss') return;
        deleteMutation.mutate({
            scriptID: editContext.scriptID,
            divisionIdx: editContext.divisionIdx,
            cueIdx
        });
    }

    function closeEditor(res: 'dismiss' | 'accept') {
        setIsEditing(false);

        const newTextCue = { actors: currentActors, text: content };

        if (
            !(newTextCue.actors.length > 0 && newTextCue.text.trim().length > 0) &&
            res === 'accept'
        )
            return;

        if (res === 'dismiss') {
            setContent(textCue?.text ?? '');
            setCurrentActors(textCue?.actors ?? []);
            return;
        }

        updateMutation.mutate({
            scriptID: editContext.scriptID,
            divisionIdx: editContext.divisionIdx,
            cueIdx,
            cue: {
                ...cuePair,
                [type]: newTextCue,
            }
        });
    }

    // FIXME: The popover currently applies to the entire cue wrapper, not just the smaller element
    // provided by ref. There might need to be a way to `usePopover` on target element refs in the
    // future.
    return (
        <>
            <Modal context={modalContext}/>
            <Popover
                trigger="contextmenu"
                placement="auto"
                content={<TextCueEditMenu onEdit={() => setIsEditing(true)} onDelete={onDelete} />}>
                <TextCueDataView
                    type={type}
                    actorsInfo={formatActorsArray(
                        type === 'response' && currentActors.length === 1
                            ? null
                            : currentActors,
                    )}
                    text={formatMarkdown(textCue?.text ?? '_Du bist der erste in diesem Abschnitt_')}
                    className={classnames({ 'ring-2 ring-primary': isEditing })}
                    beforeExtra={isEditing && 
                        <CreateActorsSelector
                            type={type}
                            actors={currentActors}
                            onActorsChange={setCurrentActors}/>}
                    afterExtra={isEditing && <EditCommitView close={closeEditor} />}>
                    {isEditing ? (
                        <Editor content={content} onChange={setContent} autofocus />
                    ) : undefined}
                </TextCueDataView>
            </Popover>
        </>
    );
}

function GapInjectHandle(props: { index: number }): JSX.Element {
    const editContext = useContext(DivisionContextObj)!;
    const [isInserting, setIsInserting] = useState(false);

    const createMutation = useCreateCue();

    function insertNewCue(newCue: Omit<TextCuePair, 'previousScores'>) {
        setIsInserting(false);
        createMutation.mutate({
            scriptID: editContext.scriptID,
            divisionIdx: editContext.divisionIdx,
            cueIdx: props.index,
            cue: {
                request: newCue.request,
                response: newCue.response,
                previousScores: [],
            },
        });
    }

    return (
        <>
            {!isInserting ? (
                <div className="contents" onClick={() => setIsInserting(true)}>
                    <div className="hover:text-lighter2 before:border-lighter2 absolute -top-6 left-0 h-6 w-full cursor-pointer text-transparent before:absolute before:top-1/2 before:left-0 before:w-full hover:before:border-b">
                        <i className="bi bi-plus-circle bg-background absolute top-0 left-1/2 -translate-x-1/2 rounded-full" />
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
        <div className="relative mt-6 flex flex-col gap-6">
            <GapInjectHandle index={props.idx} />
            <EditableTextCueView cueIdx={props.idx} cuePair={props.textCuePair} type="request" />
            <EditableTextCueView cueIdx={props.idx} cuePair={props.textCuePair} type="response" />
        </div>
    );
}

function ActorPill(
    { selected, className, ...rest }: PillProps & {
        selected?: boolean;
    },
) {
    return (
        <BaseActorPill
            className={classnames(
                selected && 'bg-[var(--actor-color)]/30 outline-[var(--actor-color)]/30 outline-offset-2 outline',
                !selected && 'hover:bg-[var(--actor-color)]/20',
                className,
            )}
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
    const [newActors, setNewActors] = useState<string[]>([]);
    // const [selected, setSelected] = useState<string[]>([]);

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
        if (!props.actors.includes(newActor)) setNewActors([...newActors, newActor]);
        props.onSelectionChange([...props.selectedActors, newActor]);
    }

    return (
        <div className={`flex flex-wrap gap-2`}>
            {props.self === undefined ? null : (
                <ActorPill className="pointer-events-none" actorForColor={props.self} selected>
                    Ich
                </ActorPill>
            )}
            {[...props.actors, ...newActors]
                .filter(actor => actor !== props.self)
                .map(actor => (
                    <ActorPill
                        className="cursor-pointer"
                        selected={props.selectedActors.includes(actor)}
                        onClick={() => toggleSelection(actor)}
                        key={actor}>
                        {actor}
                    </ActorPill>
                ))}
            <AddActorButton onAddActor={onAddActor} />
        </div>
    );
}

function AddActorButton(props: { onAddActor: (actor: string) => void }): JSX.Element {
    const [currentContent, setCurrentContent] = useState<string>();
    const [isEditing, setIsEditing] = useState<boolean>(false);

    // FIXME: use properly configured contenteditable element, instead of dynamically resizing
    // input elements
    const ocanvas = new OffscreenCanvas(1, 1);
    const ctx = ocanvas.getContext('2d')!;
    const spanRef = useRef<HTMLSpanElement>(null);

    function onContentChange(newText: string) {
        if (newText.trim().length === 0) setCurrentContent(undefined);
        else setCurrentContent(newText);

        // FIXME: don't update input like this, use contentediable element
        const inputElement = spanRef.current?.querySelector('input') ?? undefined;
        if (spanRef.current === null || inputElement === undefined) return;

        const computedStyle = window.getComputedStyle(spanRef.current);
        const { fontStyle, fontVariant, fontWeight, fontSize, lineHeight, fontFamily } =
            computedStyle;
        ctx.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;

        const textMetrics = ctx.measureText(newText);
        inputElement.style.setProperty('--text-width', `${textMetrics.width}px`);
    }

    function editDone() {
        setIsEditing(false);
        const newName = currentContent;
        if (newName === undefined) return;
        setCurrentContent(undefined);
        props.onAddActor(newName);
    }

    return (
        <MakeEditableContent
            component={ActorPill}
            isEditable={isEditing}
            onContentChange={onContentChange}
            onEditEnd={editDone}

            ref={spanRef}
            onClick={!isEditing ? () => setIsEditing(true) : undefined}
            actorForColor={currentContent}
            extra="+"
            children={currentContent ?? ''}
        />
    );
}

function NewTextCueView(props: {
    type: 'request' | 'response';
    actors: string[];
    self?: string;
    onChange: (cue: TextCue) => void;
}): JSX.Element {
    const [selectedActors, setSelectedActors] = useState<string[]>([]);
    const [content, setContent] = useState<string>('');

    useEffect(() => {
        props.onChange({
            text: content,
            actors: props.self === undefined ? selectedActors : [...selectedActors, props.self],
        });
    }, [content]);

    return (
        <TextCueDataView
            type={props.type}
            actorsInfo={null}
            text={[]}
            beforeExtra={
                <ActorsSelector
                    self={props.self}
                    actors={props.actors}
                    selectedActors={selectedActors}
                    onSelectionChange={setSelectedActors}
                />
            }>
            <Editor
                content={content}
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
    const [request, setRequest] = useState<TextCue>({
        text: '',
        actors: [],
    });
    const [response, setResponse] = useState<TextCue>({
        text: '',
        actors: props.self === undefined ? [] : [props.self],
    });

    const isValidCue = (cue: TextCue) => cue.actors.length > 0 && cue.text.length > 0;

    const isValid = useMemo(() => {
        return isValidCue(request) && isValidCue(response);
    }, [request, response]);

    function buildCuePair() {
        return { request, response };
    }

    return (
        <div className="bg-accent2 border-lighter1 relative -left-2 z-2 my-3 flex w-[calc(100%)+var(--spacing)*4] flex-col gap-6 rounded-lg border p-2">
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
            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={props.onDismiss}>
                    Abbrechen
                </Button>
                <Button
                    variant="primary"
                    disabled={!isValid}
                    onClick={() => props.onAccept(buildCuePair())}>
                    Hinzufügen
                </Button>
            </div>
        </div>
    );
}

function DivisionEditMenu(props: { onEdit: () => void; onRename: () => void }): JSX.Element {
    return (
        <>
            <PopoverMenuItem onClick={props.onEdit}>Bearbeiten</PopoverMenuItem>
            <PopoverMenuItem onClick={props.onRename}>Umbenennen</PopoverMenuItem>
        </>
    );
}

function EditableDivisionInfoView(props: {
    division: Division;
    onRename: () => void;
}): JSX.Element {
    const editContext = useContext(DivisionContextObj)!;
    const [isEditing, setIsEditing] = useState<boolean>(false);
    let infoElement: HTMLDivElement | undefined = undefined;

    // TODO: what exactly is this contraption?
    const [currentContent, setCurrentContent] = useState<string>(props.division.description);

    const descriptionMutation = useUpdateDivisionDescription(); 

    function closeEditor(res: 'dismiss' | 'accept') {
        if (isEditing) {
            setIsEditing(false);

            if (res === 'dismiss') setCurrentContent(props.division.description);
            else {
                descriptionMutation.mutate({
                    scriptID: editContext.scriptID,
                    divisionIdx: editContext.divisionIdx,
                    description: currentContent
                });
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
                className={classnames({ editing: isEditing })}
                external={
                    isEditing ? (
                        <Editor
                            content={props.division.description}
                            onChange={setCurrentContent}
                            autofocus
                        />
                    ) : undefined
                }
                ref={infoElement}>
                {isEditing && <EditCommitView close={closeEditor} />}
            </CreateDivisionInfoView>
        </Popover>
    );
}

function HeadingWithEditButton(
    { children, onEditClick, ...rest }: {
        children: ReactNode;
        onEditClick: () => void;
    } & ComponentProps<'h2'>,
): JSX.Element {
    // FIXME: maybe remove memo
    const isSimpleContent = useMemo(() => typeof children === 'string', [children]);

    return (
        <h2 className="text-heading-2 top-0 py-2 text-center" {...rest}>
            {children}
            {isSimpleContent && (
                <IconButton icon="pencil" className="text-lighter2" onClick={onEditClick} />
            )}
        </h2>
    );
}

function DivisionView(props: { division: Division }): JSX.Element {
    const editContext = useContext(DivisionContextObj)!;

    const [isEditing, setIsEditing] = useState<boolean>(false);

    // FIXME: Is this really the best we can do here?
    //        Lets come back and clearly state the goal of this contraption
    const [currentName, setCurrentName] = useState<string>(props.division.name);
    useEffect(() => setCurrentName(props.division.name), [props.division]);

    const renameMutation = useRenameDivision(); 

    function onRename() {
        setIsEditing(true);
    }

    function onRenameDone() {
        setIsEditing(false);
        if (currentName === props.division.name || currentName.length === 0) return;
        renameMutation.mutate({
            scriptID: editContext.scriptID,
            divisionIdx: editContext.divisionIdx,
            name: currentName
        });
    }

    return (
        <div className="flex flex-col">
            <MakeEditableContent
                component={HeadingWithEditButton}
                isEditable={isEditing}
                onContentChange={setCurrentName}
                onEditEnd={onRenameDone}

                onEditClick={onRename}>
                {currentName}
            </MakeEditableContent>
            <EditableDivisionInfoView division={props.division} onRename={onRename} />
            {props.division.textCues.map((pair, idx) => 
                <EditableTextCuePairView textCuePair={pair} idx={idx} key={pair.request?.text + pair.response?.text}/>)}
        </div>
    );
}

type DivisionContext = {
    scriptID: schemas.UUID;
    divisionIdx: number;
    scriptInfo: ScriptInfo
};

const DivisionContextObj = createContext<DivisionContext|undefined>(undefined);

function ScriptView({ scriptID }: { scriptID: schemas.UUID }): JSX.Element {
    const authentication = useContext(AuthenticationContextObj)!;
    const scriptQuery = useQuery(scriptQueryOptions(authentication, scriptID));

    useEffect(() => {
        if (scriptQuery.isSuccess)
            document.title = `${scriptQuery.data.name} - Quipt`;
    }, [scriptQuery]);

    const scriptInfo = useMemo(() => scriptQuery.isSuccess 
        ? computeScriptInfo(scriptQuery.data)
        : undefined,
        [scriptQuery]
    );

    return (
        <>
            <div className="w-250 max-w-250 select-none">
                {scriptQuery.isSuccess && scriptQuery.data.divisions.map((division, divisionIdx) => (
                    <DivisionContextObj.Provider 
                        value={{ scriptID, divisionIdx, scriptInfo: scriptInfo! }} 
                        key={division.name}>
                        <DivisionView division={division}/>
                    </DivisionContextObj.Provider>
                ))}
            </div>
        </>
    );
}

export function ScriptPage(): JSX.Element {
    const location = useLocation();
    const breakpoints = useBreakpoints();
    const scriptParams = useScriptParams();

    const currentRoute = useMemo(() => {
        if (location.pathname.startsWith('/train')) return 'train';
        return 'view';
    }, [location]);

    return (
        <ScrollContainer>
            <div className="flex justify-center gap-8 p-4">
                {currentRoute === 'view' ? (
                    <ScriptView scriptID={scriptParams.scriptID!} />
                ) : (
                    // FIXME: params.division is absolutely not enforced (existance and validtiy) and
                    // using params directly isn't exactly a great source of truth
                    <TrainingRunWrapper
                        scriptID={scriptParams.scriptID!}
                        divisionIdx={scriptParams.divisionIdx!}
                    />
                )}
                {breakpoints.xl && (
                    <div className="w-120 max-w-120 min-w-90">
                        <div className="bg-accent1 sticky top-4 h-[calc(100cqh-var(--spacing)*8)]">
                            <ScriptOverview scriptID={scriptParams.scriptID!} />
                        </div>
                    </div>
                )}
            </div>
        </ScrollContainer>
    );
}
