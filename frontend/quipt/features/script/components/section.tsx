import {
    type ComponentProps,
    type JSX,
    type ReactElement,
    memo,
    useState,
    useId,
    useMemo,
    useRef,
} from 'react';

import { Button as BaseButton, Input, Menu, Toggle, ToggleGroup } from '@base-ui/react';
import classnames from 'classnames';

import { Icon } from 'quipt/components/icon';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';
import { FormattedStringView } from 'quipt/components/formatted-string-view';
import { FormattedString, renderBBCode } from 'quipt/formatted-string';
import { useBreakpointsOnce } from 'quipt/responsive';
import { formatActorsArray } from 'quipt/utils';
import {
    MenuItem,
    MenuBox,
    MenuSeparator,
    popupClass,
    MenuCheckboxItem,
    menuItemClass,
} from './menu';
import { ContentInfoView, HLine, PlayButton } from './common';
import { Editor } from './editor';
import { ActorPill, ActorsContainer } from './actors-container';
import { useKeyedState, useScriptEditorStore, useScriptEditorStateAccessor } from '../model/hooks';
import {
    ActionNode,
    type ActorKey,
    DialogueNode,
    type ContentfulScriptNode,
    type Key,
    type ScriptNode,
    SectionNode,
    keyOfType,
    Actor,
} from '../model/state';
import * as actions from '../model/actions';
import type { ScriptEditorStore } from '../model/store';
import { createEditorState } from '../model/editor';
import { useLongPress } from '../long-press';

type VirtualizedElementProps = Omit<ComponentProps<'div'>, 'className'>;

export function ResponseMarker(): JSX.Element {
    return (
        <span className="text-info text-accent-100 border-accent-100 rounded-full border px-2 py-0.5">
            Einsatz
        </span>
    );
}

export function SectionInfoHeader({
    section,
    ...props
}: { section: SectionNode } & VirtualizedElementProps): JSX.Element {
    type SectionInfoState = 'expanded' | 'collapsed';
    const inputId = useId();

    const breakpoints = useBreakpointsOnce();
    const store = useScriptEditorStore();
    const [sectionState, setSectionState] = useState<SectionInfoState>(() =>
        breakpoints.sm ? 'expanded' : 'collapsed',
    );

    function handleStateToggle() {
        setSectionState(sectionState === 'expanded' ? 'collapsed' : 'expanded');
    }

    return (
        <div
            className="absolute top-0 right-0 left-0 flex w-auto flex-col gap-y-3 px-3 sm:mx-3 sm:px-6"
            {...props}>
            <HLine className="mb-2 sm:mb-4" />
            {!section.editing ? (
                <div className="relative flex items-center gap-x-5">
                    <h2 className="text-heading-2 whitespace-pre">{section.name}</h2>
                    <div className="flex gap-x-2">
                        <Tooltip label={sectionState === 'expanded' ? 'Einklappen' : 'Aufklappen'}>
                            <IconButton
                                iconName={
                                    sectionState === 'expanded'
                                        ? 'chevron-contract'
                                        : 'chevron-expand'
                                }
                                render={<Tooltip.Trigger />}
                                onClick={handleStateToggle}
                            />
                        </Tooltip>
                        <Tooltip label="Umbenennen">
                            <IconButton
                                iconName="input-cursor-text"
                                onClick={() =>
                                    store.dispatchStateAction(actions.editSectionBegin, section.key)
                                }
                                render={<Tooltip.Trigger />}
                            />
                        </Tooltip>
                        <Tooltip label="Löschen">
                            <IconButton
                                iconName="trash"
                                onClick={() =>
                                    store.dispatchStateAction(actions.removeSection, section.key)
                                }
                                render={<Tooltip.Trigger />}
                            />
                        </Tooltip>
                    </div>
                    <PlayButton className="absolute top-1/2 right-0 -translate-y-1/2" />
                </div>
            ) : (
                <div className="relative before:absolute before:top-0 before:-right-2 before:bottom-0 before:-left-2 before:-z-1 before:rounded-lg before:bg-black">
                    <Input
                        className="text-heading-2 w-full outline-none"
                        value={section.name}
                        id={inputId}
                        autoFocus
                        onBlur={() =>
                            store.dispatchStateAction(actions.editSectionEnd, section.key)
                        }
                        onValueChange={(value, event) =>
                            store.dispatchStateAction(actions.renameSection, {
                                sectionKey: section.key,
                                name: value,
                                inputId,
                                event: event.event,
                            })
                        }
                    />
                </div>
            )}
            {sectionState === 'expanded' && (
                <div className="flex flex-col gap-y-3 sm:max-w-3/4">
                    <ContentInfoView
                        actors={section.actors}
                        dialogueCount={section.dialogueCount}
                    />
                </div>
            )}
        </div>
    );
}

function editItemBegin(store: ScriptEditorStore, nodeKey: Key<ContentfulScriptNode>) {
    if (!editItemEnd(store)) return;
    const editorState = createEditorState(store, nodeKey);
    store.dispatchStateAction(actions.setEditingNodeState, {
        editorState,
        nodeKey,
    });
    store.update({ editingNode: nodeKey });
}

function editItemEnd(store: ScriptEditorStore): boolean {
    const editingNode = store.readState('editingNode');
    if (editingNode === null || !store.readState('isEditing', editingNode)) return true;
    if (!store.readState('isValid', editingNode)) return false;
    store.dispatchStateAction(actions.setEditingNodeState, null);
    store.update({ editingNode: null });
    return true;
}

function createNewItem(
    store: ScriptEditorStore,
    kind: 'action' | 'dialogue',
    referenceKey: Key<ContentfulScriptNode>,
) {
    if (!editItemEnd(store)) return;
    const newNodeKey = store.dispatchStateAction(actions.insertNewItemBefore, {
        kind,
        referenceKey,
    });
    editItemBegin(store, newNodeKey);
}

function ContentfulScriptNodeMenu({ nodeKey }: { nodeKey: Key<ContentfulScriptNode> }) {
    const store = useScriptEditorStore();

    const node = useKeyedState(nodeKey);

    let actorMarksAsResponse = false;
    if (node instanceof DialogueNode && store.editorState.selfActor)
        actorMarksAsResponse = node.actors.includes(store.editorState.selfActor);

    const markedAsContext = actorMarksAsResponse || node.markedAsContext;

    return (
        <MenuBox>
            <MenuItem iconName="check2-circle">Auswählen</MenuItem>
            <MenuItem iconName="pencil" onClick={() => editItemBegin(store, nodeKey)}>
                Bearbeiten
            </MenuItem>
            <MenuItem iconName="play-fill">Ab hier üben</MenuItem>
            <MenuSeparator />
            <MenuCheckboxItem
                checked={markedAsContext}
                onClick={() =>
                    store.dispatchStateAction(actions.toggleNodeMarkedAsContext, nodeKey)
                }
                disabled={actorMarksAsResponse || store.editorState.selfActor === null}>
                {keyOfType(nodeKey, DialogueNode)
                    ? 'Als Antwort markieren'
                    : 'Als Kontext markieren'}
            </MenuCheckboxItem>
            <MenuSeparator />
            <Menu.SubmenuRoot>
                <Menu.SubmenuTrigger className={menuItemClass}>
                    <span className="size-5">
                        <Icon iconName="plus" className="size-5" />
                    </span>
                    Neu davor einfügen
                    <Icon
                        iconName="caret-right-fill"
                        className="text-accent-100 ms-auto me-1 size-4"
                    />
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                    <Menu.Positioner
                        className="outline-hidden"
                        sideOffset={getOffset}
                        alignOffset={getOffset}>
                        <Menu.Popup className={popupClass}>
                            <MenuBox>
                                <MenuItem
                                    iconName="chat-text"
                                    onClick={() => createNewItem(store, 'dialogue', nodeKey)}>
                                    Dialog erstellen
                                </MenuItem>
                                <MenuItem
                                    iconName="card-text"
                                    onClick={() =>
                                        store.dispatchStateAction(actions.insertNewItemBefore, {
                                            kind: 'action',
                                            referenceKey: nodeKey,
                                        })
                                    }>
                                    Handlung erstellen
                                </MenuItem>
                            </MenuBox>
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.SubmenuRoot>
            <MenuItem
                iconName="trash"
                onClick={() => store.dispatchStateAction(actions.removeContentfulNode, nodeKey)}

                className="text-red-500 data-highlighted:before:bg-red-500/20!">
                Löschen
            </MenuItem>
        </MenuBox>
    );
}

function getOffset({ side }: { side: Menu.Positioner.Props['side'] }) {
    return side === 'top' || side === 'bottom' ? 4 : -4;
}

function HoverActionsContainer({
    itemKey,
    menuOpen,
    onMenuOpenChange,
}: {
    menuOpen: boolean;
    itemKey: Key<ContentfulScriptNode>;
    onMenuOpenChange: (open: boolean, eventDetails: Menu.Root.ChangeEventDetails) => void;
}): JSX.Element {
    return (
        <ActionsContainer className="invisible group-hover:not-group-data-editing:visible has-data-popup-open:visible">
            <Menu.Root open={menuOpen} onOpenChange={onMenuOpenChange}>
                <IconButton
                    iconName="three-dots-vertical"
                    className="text-foreground"
                    render={<Menu.Trigger />}
                />
                <Menu.Portal>
                    <Menu.Positioner sideOffset={8} align="start" className="outline-hidden">
                        <Menu.Popup className={popupClass}>
                            <ContentfulScriptNodeMenu nodeKey={itemKey} />
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>
        </ActionsContainer>
    );
}

function EditActionsContainer({ itemKey }: { itemKey: Key<ContentfulScriptNode> }): JSX.Element {
    const store = useScriptEditorStore();
    const isValid = store.useState('isValid', itemKey);
    return (
        <ActionsContainer>
            <IconButton
                iconName="check2"
                className="text-foreground"
                disabled={!isValid}
                onClick={() => editItemEnd(store)}
            />
        </ActionsContainer>
    );
}

function ActionsContainer({ className, ...props }: ComponentProps<'div'>): JSX.Element {
    return (
        <div
            className={classnames(
                'bg-background border-accent-30 absolute -top-7 right-6 z-2 flex gap-x-2 rounded-xl border p-1 shadow-lg/50',
                className,
            )}
            {...props}
        />
    );
}

function NodeContentView({
    className,
    itemKey,
}: {
    className?: string;
    itemKey: Key<ContentfulScriptNode>;
}): JSX.Element {
    const item = useKeyedState(itemKey);

    const store = useScriptEditorStore();
    const isEditing = store.useState('isEditing', itemKey);
    const editingNodeState = useScriptEditorStateAccessor(state => state.editingNodeState);

    const content = useMemo(
        () => (isEditing ? null : renderBBCode(item.text)),
        [item.text, isEditing],
    );

    return (
        <div
            className={classnames(
                'before:border-accent-30 data-editing:before:bg-accent-10 relative before:absolute before:top-0 before:-right-2 before:bottom-0 before:-left-2 before:-z-1 before:rounded-lg data-editing:py-1 data-editing:before:border sm:before:-top-1 sm:before:-bottom-1',
                className,
            )}
            data-editing={isEditing ? '' : undefined}>
            {content instanceof FormattedString ? (
                <p className="whitespace-pre-wrap">
                    <FormattedStringView string={content} />
                </p>
            ) : (
                editingNodeState && <Editor state={editingNodeState.editorState} />
            )}
        </div>
    );
}

function ActorsSelectorPill({ actor }: { actor: ActorKey }): JSX.Element {
    return (
        <Toggle
            value={`${actor}`}
            render={(props, { pressed }) => (
                <ActorPill actorKey={actor} selected={pressed} interactable {...props} />
            )}
        />
    );
}

interface ActorsSelectorProps {
    actors: readonly ActorKey[];
    onActorsChange?: (selected: ActorKey[]) => void;
}

function ActorsSelector({ actors, onActorsChange }: ActorsSelectorProps): JSX.Element {
    const allActors = useScriptEditorStateAccessor(state => state.actors);
    return (
        <ToggleGroup
            value={actors}
            className="flex flex-wrap gap-2 p-2"
            onValueChange={onActorsChange}
            multiple>
            {actors.map(actor => (
                <ActorsSelectorPill key={actor} actor={actor} />
            ))}
            {Array.from(
                allActors
                    .keys()
                    .filter(actor => !actors.includes(actor))
                    .map(actor => <ActorsSelectorPill key={actor} actor={actor} />),
            )}
        </ToggleGroup>
    );
}

function DialogueActorsEditMenu({
    actors,
    onActorAdd,
    onActorsChange,
}: {
    actors: readonly ActorKey[];
    onActorAdd?: () => void;
    onActorsChange?: (selected: ActorKey[]) => void;
}): JSX.Element {
    return (
        <MenuBox>
            <ActorsSelector actors={actors} onActorsChange={onActorsChange} />
            <MenuSeparator />
            <MenuItem iconName="plus-lg" onClick={onActorAdd}>
                Spieler hinzufügen
            </MenuItem>
        </MenuBox>
    );
}

function DialogueActorsLine({ dialogueKey }: { dialogueKey: Key<DialogueNode> }): JSX.Element {
    const actorsContainerActionsRef = useRef<ActorsContainer.Actions>(null);

    const store = useScriptEditorStore();

    const isEditing = store.useState('isEditing', dialogueKey);

    const dialogue = useKeyedState(dialogueKey);
    const actors = useKeyedState(dialogue.actors);
    const selfActor = useScriptEditorStateAccessor(state => state.selfActor);

    const actorMarksAsContext = selfActor ? dialogue.actors.includes(selfActor) : false;
    const markedAsContext = actorMarksAsContext || dialogue.markedAsContext;

    function handleActorAdd() {
        const actorsContainerActions = actorsContainerActionsRef.current;
        if (actorsContainerActions === null) return;
        const resetIndex = store.readState('historyIndex');
        const newActorKey = store.dispatchStateAction(actions.createActorOnDialogue, dialogueKey);
        actorsContainerActions.editActor({
            actorKey: newActorKey,
            resetIndex,
        });
    }

    const actorsString = useMemo(() => {
        if (isEditing) return new FormattedString();

        const selfActorIndex = dialogue.actors.indexOf(selfActor!);
        let modifiedActors: Actor[];
        if (selfActor && selfActorIndex !== -1) {
            modifiedActors = [...actors];
            modifiedActors.splice(selfActorIndex, 1);
            modifiedActors.splice(0, 0, actors[selfActorIndex]);
        } else {
            modifiedActors = actors;
        }
        return formatActorsArray(modifiedActors);
    }, [actors, selfActor, isEditing]);

    return (
        <div className="flex items-center gap-x-2">
            {!isEditing ? (
                <>
                    <p className="font-semibold">
                        <FormattedStringView string={actorsString} />
                    </p>
                    {markedAsContext && <ResponseMarker />}
                </>
            ) : (
                <ActorsContainer
                    className="flex gap-x-1"
                    actors={dialogue.actors}
                    actionsRef={actorsContainerActionsRef}>
                    <Menu.Root>
                        <BaseButton
                            className="bg-primary hover:bg-light-primary cursor-pointer rounded-full p-1.5"
                            aria-label="Spieler hinzufügen"
                            render={<Menu.Trigger />}>
                            <Icon iconName="pencil" className="text-white" />
                        </BaseButton>
                        <Menu.Portal>
                            <Menu.Positioner
                                sideOffset={8}
                                align="start"
                                className="outline-hidden">
                                <Menu.Popup className={popupClass}>
                                    <DialogueActorsEditMenu
                                        actors={dialogue.actors}
                                        onActorsChange={actors =>
                                            store.dispatchStateAction(
                                                actions.changeDialogueActors,
                                                {
                                                    dialogue: dialogueKey,
                                                    actors,
                                                },
                                            )
                                        }
                                        onActorAdd={handleActorAdd}
                                    />
                                </Menu.Popup>
                            </Menu.Positioner>
                        </Menu.Portal>
                    </Menu.Root>
                </ActorsContainer>
            )}
        </div>
    );
}

const DialogueView = memo(function DialogueView({
    dialogueKey,
    ...props
}: { dialogueKey: Key<DialogueNode> } & VirtualizedElementProps): JSX.Element | null {
    return (
        <HoverableSectionItem
            className="data-editing:gap-y-1 sm:data-editing:gap-y-2"
            itemKey={dialogueKey}
            {...props}>
            <DialogueActorsLine dialogueKey={dialogueKey} />
            <NodeContentView itemKey={dialogueKey} />
        </HoverableSectionItem>
    );
});

const ActionView = memo(function ActionView({
    actionKey,
    ...props
}: { actionKey: Key<ActionNode> } & VirtualizedElementProps): JSX.Element | null {
    return (
        <HoverableSectionItem itemKey={actionKey} {...props}>
            <NodeContentView className="mx-auto w-31/40" itemKey={actionKey} />
        </HoverableSectionItem>
    );
});

function HoverableSectionItem({
    className,
    children,
    itemKey,
    ...props
}: { itemKey: Key<ContentfulScriptNode> } & ComponentProps<'div'>): JSX.Element {
    const store = useScriptEditorStore();
    const isEditing = store.useState('isEditing', itemKey);

    const [menuOpen, setMenuOpen] = useState(false);

    const longPressResult = useLongPress(() => {
        setMenuOpen(true);
    });

    return (
        <div
            className={classnames(
                'has-data-popup-open:before:bg-accent-100/10 active:before:bg-accent-100/10 hover:before:bg-accent-100/10 group data-editing:before:bg-accent-100/20 absolute top-0 right-0 left-0 flex w-auto flex-col px-3 before:absolute before:-top-1 before:right-0 before:-bottom-1 before:left-0 before:-z-1 before:rounded-xl sm:mx-3 sm:px-6 sm:before:-top-2 sm:before:-bottom-2',
                className,
            )}
            data-editing={isEditing ? '' : undefined}
            {...props}
            {...longPressResult}>
            <HoverActionsContainer
                itemKey={itemKey}
                menuOpen={menuOpen}
                onMenuOpenChange={setMenuOpen}
            />
            {isEditing && <EditActionsContainer itemKey={itemKey} />}
            {children}
        </div>
    );
}

function SubsectionDivider({
    name,
    ...props
}: { name: string } & VirtualizedElementProps): JSX.Element {
    return (
        <div
            className="absolute top-0 right-0 left-0 flex w-auto items-center gap-x-3 px-3 sm:mx-3 sm:px-6"
            {...props}>
            <HLine className="flex-1" />
            <span className="text-info text-accent-100">{name}</span>
            <HLine className="flex-1" />
        </div>
    );
}

const SectionRenderer = memo(function SectionRenderer({
    sectionKey,
    ...props
}: { sectionKey: Key<SectionNode> } & VirtualizedElementProps): JSX.Element {
    const section = useKeyedState(sectionKey);
    if (section.depth === 0) return <SectionInfoHeader section={section} {...props} />;
    return <SubsectionDivider name={section.name} {...props} />;
});

export function renderContentNode(item: Key<ScriptNode>): ReactElement<any> | null {
    if (keyOfType<ActionNode>(item, ActionNode)) return <ActionView actionKey={item} />;
    else if (keyOfType(item, DialogueNode)) return <DialogueView dialogueKey={item} />;
    else if (keyOfType(item, SectionNode)) return <SectionRenderer sectionKey={item} />;
    return null;
}
