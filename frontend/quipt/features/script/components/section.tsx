import { type ComponentProps, type JSX, type ReactElement, useMemo, useState } from 'react';

import { Button as BaseButton, Menu, Toggle, ToggleGroup, type HTMLProps } from '@base-ui/react';
import classnames from 'classnames';

import { Icon } from 'quipt/components/icon';
import { ActorPill } from 'quipt/components/actor-pill';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';
import { FormattedStringView } from 'quipt/components/formatted-string-view';
import { FormattedString } from 'quipt/formatted-string';
import { useBreakpoints } from 'quipt/responsive';
import { formatActorsArray } from 'quipt/utils';
import { MenuItem, MenuBox, MenuSeparator, popupClass } from './menu';
import { ContentInfoView, HLine, PlayButton } from './common';
import { ScriptViewManager, useScriptViewManager, useScriptViewState } from './script';
import {
    ActionItem,
    type ActorKey,
    DialogueItem,
    DividerItem,
    ScriptViewState,
    type Section,
    type SectionItem,
} from '../state';

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
            className="absolute top-0 right-0 left-0 flex w-auto flex-col gap-y-3 px-3 pt-2 sm:mx-3 sm:px-6 sm:pt-3"
            {...props}>
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
                    <Tooltip label="Bearbeiten">
                        <IconButton iconName="pencil" render={<Tooltip.Trigger />} />
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

function ScriptItemMenu({ itemID }: { itemID: string }) {
    const manager = useScriptViewManager();

    return (
        <MenuBox>
            <MenuItem iconName="check2-circle">Auswählen</MenuItem>
            <MenuItem
                iconName="pencil"
                onClick={() => manager.dispatch(ScriptViewManager.EDIT_ITEM, { itemID })}>
                Bearbeiten
            </MenuItem>
            <MenuItem iconName="play-fill">Ab hier üben</MenuItem>
            <MenuSeparator />
            <MenuItem>Als Antwort markieren</MenuItem>
            <MenuSeparator />
            <MenuItem
                iconName="trash"
                className="text-red-500 data-highlighted:before:bg-red-500/20!">
                Löschen
            </MenuItem>
        </MenuBox>
    );
}

function HoverActionsContainer({
    onMenuOpenChange,
    itemID,
}: {
    onMenuOpenChange?: (open: boolean) => void;
    itemID: string;
}): JSX.Element {
    return (
        <ActionsContainer className="invisible group-hover:not-group-data-editing:visible group-data-menu-open:visible">
            <Menu.Root onOpenChange={onMenuOpenChange}>
                <IconButton
                    iconName="three-dots-vertical"
                    className="text-foreground"
                    render={<Menu.Trigger />}
                />
                <Menu.Portal>
                    <Menu.Positioner sideOffset={8} align="start" className="outline-hidden">
                        <Menu.Popup className={popupClass}>
                            <ScriptItemMenu itemID={itemID} />
                        </Menu.Popup>
                    </Menu.Positioner>
                </Menu.Portal>
            </Menu.Root>
        </ActionsContainer>
    );
}

function EditActionsContainer(): JSX.Element {
    return (
        <ActionsContainer>
            <IconButton iconName="check2" className="text-foreground" />
            <IconButton iconName="x" className="text-foreground" />
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

function ContentRenderer({
    content,
    editing,
    className,
}: {
    content: FormattedString;
    editing: boolean;
    className?: string;
}): JSX.Element {
    return (
        <div
            className={classnames(
                'before:border-accent-30 data-editing:before:bg-accent-10 relative before:absolute before:top-0 before:-right-2 before:bottom-0 before:-left-2 before:-z-1 before:rounded-lg data-editing:py-1 data-editing:before:border sm:before:-top-1 sm:before:-bottom-1',
                className,
            )}
            data-editing={editing ? '' : undefined}>
            <p className="whitespace-pre-wrap">
                <FormattedStringView string={content} />
            </p>
        </div>
    );
}

interface ActorsSelectorProps {
    actors: readonly ActorKey[];
    onActorsChange?: (x: ActorKey[]) => void;
}

function makeRenderActor(state: ScriptViewState): (actor: ActorKey) => JSX.Element {
    return (actor: ActorKey) => (
        <Toggle
            value={`${actor}`}
            render={(props, { pressed }) => (
                <ActorPill
                    actor={state.lookupActor(actor)}
                    selected={pressed}
                    interactable
                    {...props}
                />
            )}
        />
    );
}

function ActorsSelector({ actors, onActorsChange }: ActorsSelectorProps): JSX.Element {
    const state = useScriptViewState();
    return (
        <ToggleGroup className="flex flex-wrap gap-2 p-2" onValueChange={onActorsChange} multiple>
            {actors.map(makeRenderActor(state))}
            {state.actors.filter(actor => !actors.includes(actor)).map(makeRenderActor(state))}
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

function DialogueView({
    dialogue,
    ...props
}: { dialogue: DialogueItem } & VirtualizedElementProps): JSX.Element {
    const [menuOpen, setMenuOpen] = useState(false);
    const state = useScriptViewState();
    const formattedActorsString = useMemo(
        () => formatActorsArray(dialogue.actors.map(actor => state.lookupActor(actor))),
        [dialogue],
    );
    return (
        <HoverableSectionItem
            className="data-editing:before:bg-accent-100/20 data-editing:gap-y-1 sm:data-editing:gap-y-2"
            data-menu-open={menuOpen ? '' : undefined}
            data-editing={dialogue.editing ? '' : undefined}
            {...props}>
            <HoverActionsContainer itemID={dialogue.ID} onMenuOpenChange={setMenuOpen} />
            {dialogue.editing && <EditActionsContainer />}
            <div className="flex items-center gap-x-2">
                {!dialogue.editing ? (
                    <p className="font-semibold">
                        <FormattedStringView string={formattedActorsString} />
                    </p>
                ) : (
                    <div className="flex gap-x-1">
                        {dialogue.actors.map(actor => (
                            <ActorPill key={actor} actor={state.lookupActor(actor)} />
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
            <ContentRenderer content={dialogue.content} editing={dialogue.editing} />
        </HoverableSectionItem>
    );
}

function ActionView({
    action,
    ...props
}: { action: ActionItem } & VirtualizedElementProps): JSX.Element {
    return (
        <HoverableSectionItem
            className="data-editing:before:bg-accent-100/20"
            data-editing={action.editing ? '' : undefined}
            {...props}>
            <HoverActionsContainer itemID={action.ID} />
            {action.editing && <EditActionsContainer />}
            <ContentRenderer
                className="mx-auto w-31/40"
                content={action.content}
                editing={action.editing}
            />
        </HoverableSectionItem>
    );
}

function HoverableSectionItem({ className, ...props }: ComponentProps<'div'>): JSX.Element {
    return (
        <div
            className={classnames(
                'data-menu-open:before:bg-accent-100/10 hover:before:bg-accent-100/10 group absolute top-0 right-0 left-0 flex w-auto flex-col px-3 before:absolute before:-top-1 before:right-0 before:-bottom-1 before:left-0 before:-z-1 before:rounded-xl sm:mx-3 sm:px-6 sm:before:-top-2 sm:before:-bottom-2',
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

function* generateContentElements(items: SectionItem[]): Generator<ReactElement> {
    for (let item of items) {
        if (item instanceof ActionItem) yield <ActionView key={item.ID} action={item} />;
        else if (item instanceof DialogueItem) yield <DialogueView key={item.ID} dialogue={item} />;
        else if (item instanceof DividerItem)
            yield <SubsectionDivider key={item.ID} name={item.name} />;
    }
}

export function renderSection(section: Section): ReactElement[] {
    const content = generateContentElements(section.items);
    if (section.name !== null)
        return [
            <SectionInfoHeader
                name={section.name}
                actors={section.actors}
                dialogueCount={section.dialogueCount}
            />,
            ...content,
            <HLine className="absolute top-0 right-0 left-0 mx-3 w-auto pt-1 sm:mx-9 sm:my-2 sm:pb-2" />,
        ];
    return [
        ...content,
        <HLine className="absolute top-0 right-0 left-0 mx-3 w-auto pt-1 sm:mx-9 sm:my-2 sm:pb-2" />,
    ];
}
