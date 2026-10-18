import { type ComponentProps, type JSX, type ReactElement, memo, useState } from 'react';

import { Button as BaseButton, Menu, Toggle, ToggleGroup } from '@base-ui/react';
import classnames from 'classnames';

import { Icon } from 'quipt/components/icon';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';
import { FormattedStringView } from 'quipt/components/formatted-string-view';
import { FormattedString } from 'quipt/formatted-string';
import { useBreakpoints } from 'quipt/responsive';
import { formatActorsArray } from 'quipt/utils';
import { MenuItem, MenuBox, MenuSeparator, popupClass } from './menu';
import { ContentInfoView, HLine, PlayButton } from './common';
import { Editor } from './editor';
import { ActorKeyPill } from './actors-container';
import { useKeyedState, useScriptEditorManager, useScriptEditorState } from '../model/hooks';
import {
    ActionNode,
    type ActorKey,
    DialogueNode,
    type EditableScriptNode,
    type Key,
    type ScriptNode,
    SectionNode,
    keyOfType,
} from '../model/state';
import * as actions from '../model/actions';

type VirtualizedElementProps = Omit<ComponentProps<'div'>, 'className'>;

export function SectionInfoHeader({
    name,
    actors,
    dialogueCount,
    ...props
}: {
    name: string;
    actors: readonly ActorKey[];
    dialogueCount: number;
} & VirtualizedElementProps): JSX.Element {
    type SectionInfoState = 'expanded' | 'collapsed';

    const breakpoints = useBreakpoints();
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
            <div className="relative flex items-center gap-x-5">
                <h2 className="text-heading-2">{name}</h2>
                <div className="flex gap-x-2">
                    <Tooltip label={sectionState === 'expanded' ? 'Einklappen' : 'Aufklappen'}>
                        <IconButton
                            iconName={
                                sectionState === 'expanded' ? 'chevron-contract' : 'chevron-expand'
                            }
                            render={<Tooltip.Trigger />}
                            onClick={handleStateToggle}
                        />
                    </Tooltip>
                    <Tooltip label="Umbenennen">
                        <IconButton iconName="input-cursor-text" render={<Tooltip.Trigger />} />
                    </Tooltip>
                    <Tooltip label="Löschen">
                        <IconButton iconName="trash" render={<Tooltip.Trigger />} />
                    </Tooltip>
                </div>
                <PlayButton className="absolute top-1/2 right-0 -translate-y-1/2" />
            </div>
            {sectionState === 'expanded' && (
                <div className="flex flex-col gap-y-3 sm:max-w-3/4">
                    <ContentInfoView actors={actors} dialogueCount={dialogueCount} />
                </div>
            )}
        </div>
    );
}

function ScriptItemMenu({ itemKey }: { itemKey: Key<EditableScriptNode> }) {
    const manager = useScriptEditorManager();

    return (
        <MenuBox>
            <MenuItem iconName="check2-circle">Auswählen</MenuItem>
            <MenuItem iconName="pencil" onClick={() => manager.dispatch(actions.editItem, itemKey)}>
                Bearbeiten
            </MenuItem>
            <MenuItem iconName="play-fill">Ab hier üben</MenuItem>
            <MenuSeparator />
            <MenuItem>Als Einsatz markieren</MenuItem>
            <MenuSeparator />
            <MenuItem
                iconName="trash"
                className="text-red-500 data-highlighted:before:bg-red-500/20!">
                Löschen
            </MenuItem>
        </MenuBox>
    );
}

function HoverActionsContainer({ itemKey }: { itemKey: Key<EditableScriptNode> }): JSX.Element {
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
                            <ScriptItemMenu itemKey={itemKey} />
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>
        </ActionsContainer>
    );
}

function EditActionsContainer({ itemKey }: { itemKey: Key<EditableScriptNode> }): JSX.Element {
    const manager = useScriptEditorManager();
    return (
        <ActionsContainer>
            <IconButton
                iconName="check2"
                className="text-foreground"
                onClick={() => manager.dispatch(actions.editDone, itemKey)}
            />
            <IconButton
                iconName="x"
                className="text-foreground"
                onClick={() => manager.dispatch(actions.editDone, itemKey)}
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
    node: EditableScriptNode;
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

interface ActorsSelectorProps {
    actors: readonly ActorKey[];
    onActorsChange?: (x: ActorKey[]) => void;
}

function makeRenderActor(): (actor: ActorKey) => JSX.Element {
    return (actor: ActorKey) => (
        <Toggle
            value={`${actor}`}
            render={(props, { pressed }) => (
                <ActorKeyPill
                    key={actor}
                    actorKey={actor}
                    selected={pressed}
                    interactable
                    {...props}
                />
            )}
        />
    );
}

function ActorsSelector({ actors, onActorsChange }: ActorsSelectorProps): JSX.Element {
    const state = useScriptEditorState();
    return (
        <ToggleGroup className="flex flex-wrap gap-2 p-2" onValueChange={onActorsChange} multiple>
            {actors.map(makeRenderActor())}
            {state.actors.filter(actor => !actors.includes(actor)).map(makeRenderActor())}
        </ToggleGroup>
    );
}

function DialogueActorsEditMenu({ actors }: { actors: readonly ActorKey[] }): JSX.Element {
    return (
        <MenuBox>
            <ActorsSelector actors={actors} />
            <MenuSeparator />
            <MenuItem iconName="plus-lg">Spieler hinzufügen</MenuItem>
        </MenuBox>
    );
}

function ActorsLineRenderer({ actorKeys }: { actorKeys: readonly ActorKey[] }): JSX.Element {
    const actors = useKeyedState(actorKeys);
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
}: { dialogueKey: Key<DialogueNode> } & VirtualizedElementProps): JSX.Element {
    const dialogue = useKeyedState(dialogueKey);
    return (
        <HoverableSectionItem
            className="data-editing:before:bg-accent-100/20 data-editing:gap-y-1 sm:data-editing:gap-y-2"
            data-editing={dialogue.editing ? '' : undefined}
            {...props}>
            <HoverActionsContainer itemKey={dialogue.key} />
            {dialogue.editing && <EditActionsContainer itemKey={dialogue.key} />}
            <div className="flex items-center gap-x-2">
                {!dialogue.editing ? (
                    <ActorsLineRenderer actorKeys={dialogue.actors} />
                ) : (
                    <div className="flex gap-x-1">
                        {dialogue.actors.map(actor => (
                            <ActorKeyPill key={actor} actorKey={actor} />
                        ))}
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
                                        <DialogueActorsEditMenu actors={dialogue.actors} />
                                    </Menu.Popup>
                                </Menu.Positioner>
                            </Menu.Portal>
                        </Menu.Root>
                    </div>
                )}
            </div>
            <NodeContentRenderer node={dialogue} />
        </HoverableSectionItem>
    );
});

const ActionView = memo(function ActionView({
    actionKey,
    ...props
}: { actionKey: Key<ActionNode> } & VirtualizedElementProps): JSX.Element {
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
    if (section.depth === 0)
        return (
            <SectionInfoHeader
                name={section.name}
                actors={section.actors}
                dialogueCount={section.dialogueCount}
                {...props}
            />
        );
    return <SubsectionDivider name={section.name} {...props} />;
});

export function renderContentNode(item: Key<ScriptNode>): ReactElement<any> | null {
    if (keyOfType<ActionNode>(item, ActionNode)) return <ActionView actionKey={item} />;
    else if (keyOfType(item, DialogueNode)) return <DialogueView dialogueKey={item} />;
    else if (keyOfType(item, SectionNode)) return <SectionRenderer sectionKey={item} />;
    return null;
}
