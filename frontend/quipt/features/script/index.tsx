import { type ComponentProps, type JSX, type ReactNode, useMemo, useState } from 'react';

import { Button as BaseButton, Separator, type SeparatorProps } from '@base-ui/react';
import classnames from 'classnames';

import { type Color, colorToString } from 'quipt/color-palette';
import { Button } from 'quipt/components/button';
import { Icon } from 'quipt/components/icon';
import { ActorPill } from 'quipt/components/actor-pill';
import { SearchInput } from 'quipt/components/input';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';
import { type FormattedString, FormattedStringView } from 'quipt/components/formatted-string-view';
import { useBreakpoints } from 'quipt/responsive';

function HLine({ className, ...props }: Omit<SeparatorProps, 'orientation'>): JSX.Element {
    return (
        <Separator
            orientation="horizontal"
            className={classnames('border-accent-30 border-b-1', className)}
            {...props}
        />
    );
}

function VLine({ className, ...props }: Omit<SeparatorProps, 'orientation'>): JSX.Element {
    return (
        <Separator
            orientation="vertical"
            className={classnames('border-accent-30 border-r-1', className)}
            {...props}
        />
    );
}

function ScriptViewHeader(): JSX.Element {
    return (
        <header className="flex flex-col gap-y-2 px-9 py-2">
            <div className="flex items-center">
                <h1 className="text-heading-1">KI und K.O.</h1>
                <BaseButton className="ms-auto cursor-pointer" aria-label="Optionen">
                    <Icon iconName="three-dots-vertical" className="text-accent-100 h-7.5 w-7.5" />
                </BaseButton>
            </div>
            <HLine />
        </header>
    );
}

interface InfoSectionProps extends Omit<ComponentProps<'div'>, 'className'> {
    heading: ReactNode;
}

const testNames = [
    'James',
    'John',
    'Michael',
    'David',
    'Robert',
    'William',
    'Daniel',
    'Joseph',
    'Thomas',
    'Christopher',
    'Matthew',
    'Andrew',
    'Emma',
    'Olivia',
    'Sophia',
    'Ava',
    'Isabella',
    'Mia',
    'Charlotte',
    'Amelia',
    'Harper',
    'Evelyn',
    'Abigail',
    'Emily',
];

function InfoSection({ children, heading, ...props }: InfoSectionProps): JSX.Element {
    return (
        <div className="flex flex-col gap-y-4" {...props}>
            <h3 className="font-medium">{heading}</h3>
            {children}
        </div>
    );
}

function ActorsContainer(): JSX.Element {
    return (
        <div className="flex flex-wrap gap-2">
            {testNames.map((name, idx) => (
                <ActorPill
                    key={name}
                    className="cursor-pointer"
                    actorColor={(idx + 1) as Color}
                    children={name}
                />
            ))}
        </div>
    );
}

function InfoText({ className, ...props }: ComponentProps<'p'>): JSX.Element {
    return (
        <p
            className={classnames('text-info text-accent-100 flex items-center', className)}
            {...props}
        />
    );
}

function UserView(): JSX.Element {
    return (
        <div className="flex cursor-pointer items-center gap-x-2">
            <div className="bg-text bg-foreground h-8 w-8 rounded-full" />
            <div className="flex flex-col">
                <p>Max Mustermann</p>
                <p className="text-info text-accent-100">@Maxl</p>
            </div>
        </div>
    );
}

function ScriptInfoView(): JSX.Element {
    return (
        <div className="mx-9 my-2 flex w-70 flex-col gap-y-4">
            <InfoSection heading="Über dieses Skript">
                <ActorsContainer />
                <InfoText>
                    <Icon iconName="person-standing" className="me-2" />
                    {`${testNames.length} Spieler`}
                </InfoText>
                <InfoText>
                    <Icon iconName="chat-text" className="me-2" />
                    {`${testNames.length * 50} Einsätze`}
                </InfoText>
            </InfoSection>
            <HLine />
            <InfoSection heading="Mitwirkende (1)">
                <UserView />
            </InfoSection>
        </div>
    );
}

function PlayButton({
    className,
    ...props
}: Omit<ComponentProps<typeof BaseButton>, 'children'>): JSX.Element {
    return (
        <BaseButton
            className={classnames(
                'bg-primary hover:bg-light-primary active:bg-dark-primary cursor-pointer rounded-full p-2 transition-[color,scale] duration-250 hover:scale-[1.1] active:scale-[0.98]',
                className,
            )}
            {...props}>
            <Icon iconName="play-fill" className="icon-lg text-background" />
        </BaseButton>
    );
}

type SectionInfoState = 'expanded' | 'collapsed';

function SectionInfoHeader(): JSX.Element {
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
                <h2 className="text-heading-2">1. Akt</h2>
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
                    <ActorsContainer />
                    <InfoText>
                        <Icon iconName="person-standing" className="me-2" />
                        {`${testNames.length} Spieler`}
                    </InfoText>
                    <InfoText>
                        <Icon iconName="chat-text" className="me-2" />
                        {`${testNames.length * 50} Einsätze`}
                    </InfoText>
                </div>
            )}
        </header>
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

type Actor = {
    name: string;
    color: Color;
};

interface ScriptItemProps {
    content: string;
    editing?: boolean;
}

interface DialogueItemProps extends ScriptItemProps {
    actors: Actor[];
}

function formatActorsArray(actors: Actor[]): FormattedString {
    if (actors.length === 0) return [];

    const result: FormattedString = actors.map(actor => ({
        style: { color: `var(--color-${colorToString(actor.color)})` },
        string: actor.name,
    }));

    if (result.length === 1) {
        return result;
    }

    for (let i = 0; i < Math.floor(result.length / 2); i++) {
        const index = i * 2 + 1;
        result.splice(index, 0, {
            style: null,
            string: index === result.length - 1 ? ' und ' : ', ',
        });
    }

    return result;
}

function MyselfMarker(): JSX.Element {
    return (
        <span className="text-info text-accent-100 border-accent-100 rounded-full border px-2 py-0.5">
            ich selbst
        </span>
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

function AddActorButton(): JSX.Element {
    return (
        <BaseButton
            className="bg-primary hover:bg-light-primary cursor-pointer rounded-full p-1.5"
            aria-label="Spieler hinzufügen">
            <Icon iconName="plus-lg" className="text-white" />
        </BaseButton>
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

function DialogueItem({ actors, content, editing }: DialogueItemProps): JSX.Element {
    const formattedActorsString = useMemo(() => formatActorsArray(actors), [actors]);
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
                            <ActorPill
                                key={actor.name}
                                actorColor={actor.color}
                                children={actor.name}
                            />
                        ))}
                        <AddActorButton />
                    </div>
                )}
            </div>
            <div
                className="before:border-accent-30 data-editing:before:bg-accent-10 relative before:absolute before:top-0 before:-right-2 before:bottom-0 before:-left-2 before:-z-1 before:rounded-lg data-editing:py-1 data-editing:before:border sm:before:-top-1 sm:before:-bottom-1"
                data-editing={editing ? '' : undefined}>
                <p className="whitespace-pre-wrap">{content}</p>
            </div>
        </HoverableSectionItem>
    );
}

function ActionItem({ content, editing }: ScriptItemProps): JSX.Element {
    return (
        <HoverableSectionItem
            className="data-editing:before:bg-accent-100/20"
            data-editing={editing ? '' : undefined}>
            <HoverActionsContainer />
            {editing && <EditActionsContainer />}
            <div
                className="before:border-accent-30 data-editing:before:bg-accent-10 relative mx-auto w-31/40 before:absolute before:top-0 before:-right-2 before:bottom-0 before:-left-2 before:-z-1 before:rounded-lg data-editing:py-1 data-editing:before:border sm:before:-top-1 sm:before:-bottom-1"
                data-editing={editing ? '' : undefined}>
                <p className="whitespace-pre-wrap">{content}</p>
            </div>
        </HoverableSectionItem>
    );
}

function AddItemThing(): JSX.Element {
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

const lipsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sed malesuada justo. Aenean eget diam fringilla, tincidunt quam sed, eleifend odio. Morbi orci lorem, blandit non venenatis vitae, vulputate eget justo.`;

const lorem = `Integer tincidunt sodales enim, quis pretium tellus sagittis non. Aliquam at consequat metus. Mauris nibh velit, viverra congue sapien eu, commodo imperdiet arcu.`;

function makeActors(...indecies: number[]): Actor[] {
    return indecies.map(idx => ({ name: testNames[idx], color: (idx + 1) as Color }));
}

function SectionView({ editing }: { editing: boolean }): JSX.Element {
    return (
        <section className="flex flex-col gap-y-1 pt-2 sm:gap-y-2 sm:p-3 sm:pb-1">
            <SectionInfoHeader />
            <AddItemThing />
            <SubsectionDivider name="1. Szene" />
            <AddItemThing />
            <DialogueItem actors={makeActors(0)} content={lipsum} />
            <AddItemThing />
            <DialogueItem actors={makeActors(1, 2)} content={lipsum} />
            <AddItemThing />
            <DialogueItem actors={makeActors(3)} content={lipsum} />
            <AddItemThing />
            <ActionItem content={lorem} editing={editing} />
            <AddItemThing />
            <DialogueItem actors={makeActors(4)} content={lipsum} />
            <AddItemThing />
            <DialogueItem actors={makeActors(5, 6, 7)} content={lipsum} editing={editing} />
            <AddItemThing />
            <DialogueItem actors={makeActors(8)} content={lipsum} />
            <AddItemThing />
            <DialogueItem actors={makeActors(9)} content={lipsum} />
            <AddItemThing />
        </section>
    );
}

function ScriptContentView(): JSX.Element {
    const breakpoints = useBreakpoints();
    return (
        <div className="flex flex-1 flex-col gap-y-2 sm:gap-y-4">
            <header className="mx-3 flex sm:mx-9 sm:my-1">
                {breakpoints.sm ? (
                    <SearchInput placeholder="Skript durchsuchen" />
                ) : (
                    <Button
                        variant="secondary"
                        className="flex items-center gap-x-2"
                        aria-label="Suchen">
                        <Icon iconName="search" /> Suchen
                    </Button>
                )}
                <div className="ms-auto flex gap-x-2">
                    <Tooltip label="Rückgängig">
                        <IconButton
                            iconName="arrow-counterclockwise"
                            render={<Tooltip.Trigger />}
                        />
                    </Tooltip>
                    <Tooltip label="Kontext ausblenden">
                        <IconButton iconName="eye-slash" render={<Tooltip.Trigger />} />
                    </Tooltip>
                    <Tooltip label="Übersicht">
                        <IconButton iconName="list-nested" render={<Tooltip.Trigger />} />
                    </Tooltip>
                </div>
            </header>
            <HLine className="mx-3 sm:mx-9" />
            <SectionView editing={true} />
            <HLine className="mx-3 sm:mx-9" />
            <SectionView editing={false} />
        </div>
    );
}

function MobileScriptHeader(): JSX.Element {
    return (
        <div className="flex flex-col items-start gap-y-2 px-3 pt-2">
            <BaseButton className="bg-accent-10 rounded-full p-2">
                <Icon iconName="chevron-left" className="icon-lg" />
            </BaseButton>
            <h1 className="text-heading-1">KI und K.O.</h1>
        </div>
    );
}

function ScriptView(): JSX.Element {
    const breakpoints = useBreakpoints();

    return (
        <div className="mx-auto flex w-full max-w-343 flex-col gap-y-2 sm:gap-y-4">
            {breakpoints.sm ? (
                <>
                    <ScriptViewHeader />
                    <div className="flex max-w-full flex-1">
                        <ScriptContentView />
                        {breakpoints.lg && (
                            <>
                                <div className="pointer-events-none">
                                    <VLine className="absolute top-4 bottom-4 -z-2" />
                                    <VLine className="border-background relative -z-1 h-200 -translate-y-196" />
                                </div>
                                <ScriptInfoView />
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <MobileScriptHeader />
                    <div className="flex flex-col gap-y-3 px-3">
                        <ActorsContainer />
                        <InfoText>
                            <Icon iconName="person-standing" className="me-2" />
                            {`${testNames.length} Spieler`}
                        </InfoText>
                        <InfoText>
                            <Icon iconName="chat-text" className="me-2" />
                            {`${testNames.length * 50} Einsätze`}
                        </InfoText>
                    </div>
                    <HLine className="mx-3" />
                    <ScriptContentView />
                </>
            )}
        </div>
    );
}

export default function (): JSX.Element {
    return (
        <div className="flex w-full flex-col overflow-y-auto sm:ps-16">
            <ScriptView />
        </div>
    );
}
