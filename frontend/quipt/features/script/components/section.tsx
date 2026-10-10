import { type ComponentProps, type JSX, type ReactElement, useMemo, useState } from 'react';

import { Button as BaseButton } from '@base-ui/react';
import classnames from 'classnames';

import { Icon } from 'quipt/components/icon';
import { ActorPill } from 'quipt/components/actor-pill';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';
import { FormattedStringView } from 'quipt/components/formatted-string-view';
import { FormattedString } from 'quipt/formatted-string';
import { useBreakpoints } from 'quipt/responsive';
import { formatActorsArray } from 'quipt/utils';
import { ContentInfoView, HLine, PlayButton, addSeparators } from './common';
import {
    ActionItem,
    type ActorKey,
    DialogueItem,
    DividerItem,
    type Section,
    type SectionItem,
    useScriptViewState,
} from '../state';

function AddItemControl(): JSX.Element {
    return (
        <div className="relative">
            <div className="group absolute -top-2 right-0 left-0 flex cursor-pointer items-center gap-x-3 px-3 sm:px-6">
                <HLine className="border-accent-100 invisible flex-1 group-hover:visible" />
                <Icon
                    iconName="plus-circle"
                    className="text-accent-100 invisible group-hover:visible"
                />
                <HLine className="border-accent-100 invisible flex-1 group-hover:visible" />
            </div>
        </div>
    );
}

function SectionInfoHeader({
    name,
    actors,
    dialogueCount,
}: {
    name: string;
    actors: readonly ActorKey[];
    dialogueCount: number;
}): JSX.Element {
    type SectionInfoState = 'expanded' | 'collapsed';

    const breakpoints = useBreakpoints();
    const [sectionState, setSectionState] = useState<SectionInfoState>(() =>
        breakpoints.sm ? 'expanded' : 'collapsed',
    );

    function handleStateToggle() {
        setSectionState(sectionState === 'expanded' ? 'collapsed' : 'expanded');
    }

    return (
        <header className="flex flex-col gap-y-3 px-3 sm:px-6">
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
        </header>
    );
}

function HoverActionsContainer(): JSX.Element {
    return (
        <ActionsContainer className="invisible group-hover:not-group-data-editing:visible">
            <IconButton iconName="three-dots-vertical" className="text-foreground" />
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
            {!editing && (
                <p className="whitespace-pre-wrap">
                    <FormattedStringView string={content} />
                </p>
            )}
        </div>
    );
}

function DialogueView({ actors, content, editing }: DialogueItemProps): JSX.Element {
    const state = useScriptViewState();
    const formattedActorsString = useMemo(
        () => formatActorsArray(actors.map(actor => state.lookupActor(actor))),
        [actors],
    );
    return (
        <HoverableSectionItem
            className="data-editing:before:bg-accent-100/20 data-editing:gap-y-1 sm:data-editing:gap-y-2"
            data-editing={editing ? '' : undefined}>
            <HoverActionsContainer />
            {editing && <EditActionsContainer />}
            <div className="flex items-center gap-x-2">
                {!editing ? (
                    <p className="font-semibold">
                        <FormattedStringView string={formattedActorsString} />
                    </p>
                ) : (
                    <div className="flex gap-x-1">
                        {actors.map(actor => (
                            <ActorPill key={actor} actor={state.lookupActor(actor)} />
                        ))}
                        <BaseButton
                            className="bg-primary hover:bg-light-primary cursor-pointer rounded-full p-1.5"
                            aria-label="Spieler hinzufügen">
                            <Icon iconName="pencil" className="text-white" />
                        </BaseButton>
                    </div>
                )}
            </div>
            <ContentRenderer content={content} editing={editing} />
        </HoverableSectionItem>
    );
}

type ScriptItemProps = {
    content: FormattedString;
    editing: boolean;
};

type DialogueItemProps = ScriptItemProps & {
    actors: readonly ActorKey[];
};

function ActionView({ content, editing }: ScriptItemProps): JSX.Element {
    return (
        <HoverableSectionItem
            className="data-editing:before:bg-accent-100/20"
            data-editing={editing ? '' : undefined}>
            <HoverActionsContainer />
            {editing && <EditActionsContainer />}
            <ContentRenderer className="mx-auto w-31/40" content={content} editing={editing} />
        </HoverableSectionItem>
    );
}

function HoverableSectionItem({ className, ...props }: ComponentProps<'div'>): JSX.Element {
    return (
        <div
            className={classnames(
                'hover:before:bg-accent-100/10 group relative flex flex-col px-3 before:absolute before:-top-1 before:right-0 before:-bottom-1 before:left-0 before:-z-1 before:rounded-xl sm:px-6 sm:before:-top-2 sm:before:-bottom-2',
                className,
            )}
            {...props}
        />
    );
}

function SubsectionDivider({ name }: { name: string }): JSX.Element {
    return (
        <div className="flex items-center gap-x-3 px-3 sm:px-6">
            <HLine className="flex-1" />
            <span className="text-info text-accent-100">{name}</span>
            <HLine className="flex-1" />
        </div>
    );
}

function* generateContentElements(items: SectionItem[]): Generator<ReactElement> {
    for (let item of items) {
        if (item instanceof ActionItem)
            yield <ActionView key={item.ID} content={item.content} editing={false} />;
        else if (item instanceof DialogueItem)
            yield (
                <DialogueView
                    key={item.ID}
                    actors={item.actors}
                    content={item.content}
                    editing={false}
                />
            );
        else if (item instanceof DividerItem)
            yield <SubsectionDivider key={item.ID} name={item.name} />;
    }
}

export function SectionView({ section }: { section: Section }): JSX.Element {
    return (
        <section className="flex flex-col gap-y-1 pt-2 sm:gap-y-2 sm:p-3 sm:pb-1">
            {section.name && (
                <SectionInfoHeader
                    name={section.name}
                    actors={section.actors}
                    dialogueCount={section.dialogueCount}
                />
            )}
            {Array.from(addSeparators(generateContentElements(section.items), <AddItemControl />))}
        </section>
    );
}
