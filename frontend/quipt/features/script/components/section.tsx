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
import { FormattedString } from 'quipt/formatted-string';
import { useBreakpointsOnce } from 'quipt/responsive';
import { formatActorsArray } from 'quipt/utils';
import { MenuItem, MenuBox, MenuSeparator, popupClass, MenuCheckboxItem, menuItemClass } from './menu';
import { ContentInfoView, HLine, PlayButton } from './common';
import { Editor } from './editor';
import { ActorPill, ActorsContainer } from './actors-container';
import {
    useKeyedState,
    useScriptEditorManager,
    useScriptEditorManagerListener,
    useScriptEditorStateAccessor,
} from '../model/hooks';
import {
    ActionNode,
    type ActorKey,
    DialogueNode,
    type ContentfulScriptNode,
    type Key,
    type ScriptNode,
    SectionNode,
    keyOfType,
    ScriptEditorState,
} from '../model/state';
import * as actions from '../model/actions';
import { dispatchStateActionEvent } from '../model/manager';

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
    const manager = useScriptEditorManager();
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
                                    manager.dispatchStateAction(
                                        actions.editSectionBegin,
                                        section.key,
                                    )
                                }
                                render={<Tooltip.Trigger />}
                            />
                        </Tooltip>
                        <Tooltip label="Löschen">
                            <IconButton
                                iconName="trash"
                                onClick={() =>
                                    manager.dispatchStateAction(
                                        actions.removeSection,
                                        section.key,
                                    )
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
                            manager.dispatchStateAction(actions.editSectionEnd, section.key)
                        }
                        onValueChange={(value, event) =>
                            manager.dispatchStateAction(actions.renameSection, {
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

function ContentfulScriptNodeMenu({ nodeKey }: { nodeKey: Key<ContentfulScriptNode> }) {
    const manager = useScriptEditorManager();

    const node = useKeyedState(nodeKey);

    let actorMarksAsResponse = false;
    if (node instanceof DialogueNode && manager.state.selfActor)
        actorMarksAsResponse = node.actors.includes(manager.state.selfActor);

    const markedAsContext = actorMarksAsResponse || node.markedAsContext;

    return (
        <MenuBox>
            <MenuItem iconName="check2-circle">Auswählen</MenuItem>
            <MenuItem
                iconName="pencil"
                onClick={() =>
                    manager.dispatchStateAction(actions.editContentfulNodeBegin, nodeKey)
                }>
                Bearbeiten
            </MenuItem>
            <MenuItem iconName="play-fill">Ab hier üben</MenuItem>
            <MenuSeparator />
            <MenuCheckboxItem
                checked={markedAsContext}
                onClick={() =>
                    manager.dispatchStateAction(actions.toggleNodeMarkedAsContext, nodeKey)
                }
                disabled={actorMarksAsResponse || manager.state.selfActor === null}>
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
                        className="size-4 text-accent-100 ms-auto me-1"
                    />
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                    <Menu.Positioner
                        className="outline-hidden"
                        sideOffset={getOffset}
                        alignOffset={getOffset}
                    >
                        <Menu.Popup className={popupClass}>
                            <MenuBox>
                                <MenuItem
                                    iconName="chat-text"
                                    onClick={() =>
                                        manager.dispatchStateAction(actions.insertNewDialogueBefore, nodeKey)
                                    }
                                    >Dialog erstellen
                                </MenuItem>
                                <MenuItem
                                    iconName="card-text"
                                    onClick={() =>
                                        manager.dispatchStateAction(actions.insertNewActionBefore, nodeKey)
                                    }
                                    >
                                    Handlung erstellen
                                </MenuItem>
                            </MenuBox>
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.SubmenuRoot>
            <MenuItem
                iconName="trash"
                onClick={() =>
                    manager.dispatchStateAction(actions.removeContentfulNode, nodeKey)
                }

                className="text-red-500 data-highlighted:before:bg-red-500/20!">
                Löschen
            </MenuItem>
        </MenuBox>
    );
}

function getOffset({ side }: { side: Menu.Positioner.Props['side'] }) {
  return side === 'top' || side === 'bottom' ? 4 : -4;
}

function HoverActionsContainer({ itemKey }: { itemKey: Key<ContentfulScriptNode> }): JSX.Element {
    return (
        <ActionsContainer className="invisible group-hover:not-group-data-editing:visible has-data-popup-open:visible">
            <Menu.Root>
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
    const manager = useScriptEditorManager();
    return (
        <ActionsContainer>
            <IconButton
                iconName="check2"
                className="text-foreground"
                onClick={() => manager.dispatchStateAction(actions.editContentfulNodeDone, itemKey)}
            />
            <IconButton
                iconName="x"
                className="text-foreground"
                onClick={() => manager.dispatchStateAction(actions.editContentfulNodeDone, itemKey)}
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

function NodeContentRenderer({
    className,
    node,
}: {
    className?: string;
    node: ContentfulScriptNode;
}): JSX.Element {
    return (
        <div
            className={classnames(
                'before:border-accent-30 data-editing:before:bg-accent-10 relative before:absolute before:top-0 before:-right-2 before:bottom-0 before:-left-2 before:-z-1 before:rounded-lg data-editing:py-1 data-editing:before:border sm:before:-top-1 sm:before:-bottom-1',
                className,
            )}
            data-editing={node.editing ? '' : undefined}>
            {node.content instanceof FormattedString ? (
                <p className="whitespace-pre-wrap">
                    <FormattedStringView string={node.content} />
                </p>
            ) : (
                <Editor state={node.content} />
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
            {allActors
                .keys()
                .filter(actor => !actors.includes(actor))
                .map(actor => (
                    <ActorsSelectorPill key={actor} actor={actor} />
                ))}
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

function ActorsLineRenderer({ actorKeys }: { actorKeys: readonly ActorKey[] }): JSX.Element {
    const selfActor = useScriptEditorStateAccessor(state => state.selfActor);

    const memoizedModifiedActorsKeys = useMemo(() => {
        if (selfActor && actorKeys.includes(selfActor))
            return [selfActor, ...actorKeys.filter(actor => actor != selfActor)];
        return actorKeys;
    }, [actorKeys, selfActor]);

    const actors = useKeyedState(memoizedModifiedActorsKeys);
    const string = formatActorsArray(actors);

    return (
        <p className="font-semibold">
            <FormattedStringView string={string} />
        </p>
    );
}

const DialogueView = memo(function DialogueView({
    dialogueKey,
    ...props
}: { dialogueKey: Key<DialogueNode> } & VirtualizedElementProps): JSX.Element | null {
    const dialogue = useKeyedState(dialogueKey);
    const manager = useScriptEditorManager();
    const actorsContainerActionsRef = useRef<ActorsContainer.Actions>(null);

    const actorMarksAsCue = useScriptEditorStateAccessor(state =>
        state.selfActor ? dialogue.actors.includes(state.selfActor) : false,
    );

    const markedAsContext = actorMarksAsCue || dialogue.markedAsContext;

    useScriptEditorManagerListener(info => {
        if (info.action !== actions.createActorOnDialogue) return;
        let actionInfo = info as { input: Key<DialogueNode>; state: ScriptEditorState };
        if (actionInfo.input === dialogueKey) {
            const createdActor = actions.getCreatedActor(actionInfo.state);
            setTimeout(() => {
                actorsContainerActionsRef.current?.editActor(createdActor);
            });
        }
    }, dispatchStateActionEvent);

    return (
        <HoverableSectionItem
            className="data-editing:before:bg-accent-100/20 data-editing:gap-y-1 sm:data-editing:gap-y-2"
            data-editing={dialogue.editing ? '' : undefined}
            {...props}>
            <HoverActionsContainer itemKey={dialogue.key} />
            {dialogue.editing && <EditActionsContainer itemKey={dialogue.key} />}
            <div className="flex items-center gap-x-2">
                {!dialogue.editing ? (
                    <>
                        <ActorsLineRenderer actorKeys={dialogue.actors} />
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
                                                manager.dispatchStateAction(
                                                    actions.changeDialogueActors,
                                                    {
                                                        dialogue: dialogueKey,
                                                        actors,
                                                    },
                                                )
                                            }
                                            onActorAdd={() =>
                                                manager.dispatchStateAction(
                                                    actions.createActorOnDialogue,
                                                    dialogueKey,
                                                )
                                            }
                                        />
                                    </Menu.Popup>
                                </Menu.Positioner>
                            </Menu.Portal>
                        </Menu.Root>
                    </ActorsContainer>
                )}
            </div>
            <NodeContentRenderer node={dialogue} />
        </HoverableSectionItem>
    );
});

const ActionView = memo(function ActionView({
    actionKey,
    ...props
}: { actionKey: Key<ActionNode> } & VirtualizedElementProps): JSX.Element | null {
    const action = useKeyedState(actionKey);

    return (
        <HoverableSectionItem
            className="data-editing:before:bg-accent-100/20"
            data-editing={action.editing ? '' : undefined}
            {...props}>
            <HoverActionsContainer itemKey={action.key} />
            {action.editing && <EditActionsContainer itemKey={action.key} />}
            <NodeContentRenderer className="mx-auto w-31/40" node={action} />
        </HoverableSectionItem>
    );
});

function HoverableSectionItem({ className, ...props }: ComponentProps<'div'>): JSX.Element {
    return (
        <div
            className={classnames(
                'has-data-popup-open:before:bg-accent-100/10 hover:before:bg-accent-100/10 group absolute top-0 right-0 left-0 flex w-auto flex-col px-3 before:absolute before:-top-1 before:right-0 before:-bottom-1 before:left-0 before:-z-1 before:rounded-xl sm:mx-3 sm:px-6 sm:before:-top-2 sm:before:-bottom-2',
                className,
            )}
            {...props}
        />
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
