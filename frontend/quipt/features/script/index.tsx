import { type ComponentProps, type JSX, type ReactNode, useMemo } from 'react';

import { Button, Separator, type SeparatorProps } from '@base-ui/react'
import classnames from 'classnames';

import { type Color, colorToString } from 'quipt/color-palette';
import { Icon } from 'quipt/components/icon';
import { ActorPill } from 'quipt/components/actor-pill';
import { SearchInput } from 'quipt/components/input';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';
import { type FormattedString, FormattedStringView } from 'quipt/components/formatted-string-view';

function HLine({ className, ...props }: Omit<SeparatorProps, 'orientation'>): JSX.Element {
    return <Separator
        orientation="horizontal"
        className={classnames(
            'border-accent-30 border-b-1',
            className,
        )}
        {...props}/>;
}

function VLine({ className, ...props }: Omit<SeparatorProps, 'orientation'>): JSX.Element {
    return <Separator
        orientation="vertical"
        className={classnames(
            'border-accent-30 border-r-1',
            className,
        )}
        {...props}/>;
}

function ScriptViewHeader(): JSX.Element {
    return (
        <header className="flex flex-col gap-y-2 px-9 py-2">
            <div className="flex items-center">
                <h1 className="text-heading-1">KI und K.O.</h1>
                <Button className="cursor-pointer ms-auto" aria-label="Optionen">
                    <Icon
                        iconName="three-dots-vertical"
                        className="w-7.5 h-7.5 text-accent-100"
                    />
                </Button>
            </div>
            <HLine/>
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
    'Emily'
];

function InfoSection({ children, heading, ...props }: InfoSectionProps): JSX.Element {
    return (
        <div className="flex flex-col gap-y-4" {...props}>
            <h3 className="font-medium">{ heading }</h3>
            { children }
        </div>
    );
}

function ActorsContainer(): JSX.Element {
    return (
        <div className="flex flex-wrap gap-2">
            {
                testNames.map((name, idx) => 
                    <ActorPill 
                        key={name}
                        className="cursor-pointer"
                        actorColor={(idx + 1) as Color}
                        children={name}
                    />)
            }
        </div>
    );
}

function InfoText({ className, ...props }: ComponentProps<'p'>): JSX.Element {
    return (
        <p 
            className={classnames('flex items-center text-info text-accent-100', className)}
            {...props}
        />
    );
}

function UserView(): JSX.Element {
    return (
        <div className="flex gap-x-2 items-center cursor-pointer">
            <div className="bg-text bg-foreground h-8 w-8 rounded-full"/>
            <div className="flex flex-col">
                <p>Max Mustermann</p>
                <p className="text-info text-accent-100">@Maxl</p>
            </div>
        </div>
    );
}

function ScriptInfoView(): JSX.Element {
    return (
        <div className="flex flex-col gap-y-4 mx-9 my-2 w-70">
            <InfoSection heading="Über dieses Skript">
                <ActorsContainer/>
                <InfoText>
                    <Icon iconName="person-standing" className="me-2"/>
                    { `${testNames.length} Spieler` }
                </InfoText>
                <InfoText>
                    <Icon iconName="chat-text" className="me-2"/>
                    { `${testNames.length * 50} Einsätze` }
                </InfoText>
            </InfoSection>
            <HLine/>
            <InfoSection heading="Mitwirkende (1)">
                <UserView/>
            </InfoSection>
        </div>
    );
}

function SectionInfoHeader(): JSX.Element {
    return (
        <header className="flex flex-col px-6 gap-y-3">
            <div className="flex items-center gap-x-5">
                <h2 className="text-heading-2">1. Akt</h2>
                <div className="flex gap-x-2">
                    <Tooltip label="Einklappen">
                        <IconButton iconName="chevron-contract" render={<Tooltip.Trigger/>}/>
                    </Tooltip>
                    <Tooltip label="Bearbeiten">
                        <IconButton iconName="pencil" render={<Tooltip.Trigger/>}/>
                    </Tooltip>
                    <Tooltip label="Löschen">
                        <IconButton iconName="trash" render={<Tooltip.Trigger/>}/>
                    </Tooltip> 
                </div>
            </div>
            <div className="flex flex-col gap-y-3 max-w-3/4">
                <ActorsContainer/>
                <InfoText>
                    <Icon iconName="person-standing" className="me-2"/>
                    { `${testNames.length} Spieler` }
                </InfoText>
                <InfoText>
                    <Icon iconName="chat-text" className="me-2"/>
                    { `${testNames.length * 50} Einsätze` }
                </InfoText>
            </div>
        </header>
    );
}

function HoverableSectionItem({ className, ...props }: ComponentProps<'div'>): JSX.Element {
    return (
        <div
            className={classnames(
                'relative flex flex-col px-6 before:absolute before:left-0 before:right-0 before:-top-2 before:-bottom-2 before:rounded-xl before:-z-1 hover:before:bg-accent-100/10 group',
                className
            )}
            {...props}
        />
    );
}

function SubsectionDivider({ name }: { name: string }): JSX.Element {
    return (
        <div className="flex px-6 items-center gap-x-3">
            <HLine className="flex-1"/>
            <span className="text-info text-accent-100">{name}</span>
            <HLine className="flex-1"/>
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

    const result: FormattedString = actors
        .map(actor => ({
            style: { color: `var(--color-${colorToString(actor.color)})` },
            string: actor.name
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
        <span className="text-info rounded-full text-accent-100 border border-accent-100 py-0.5 px-2">
            ich selbst
        </span>
    );
}

function ActionsContainer({ className, ...props }: ComponentProps<'div'>): JSX.Element {
    return (
        <div 
            className={classnames(
                'absolute -top-7 right-6 z-2 flex p-1 gap-x-2 bg-background border border-accent-30 rounded-xl shadow-lg/50',
                className
            )} 
            {...props}
        />
    );
}

function AddActorButton(): JSX.Element {
    return (
        <Button className="rounded-full bg-primary p-1.5 cursor-pointer hover:bg-light-primary"
            aria-label="Spieler hinzufügen">
            <Icon iconName="plus-lg" className="text-white"/>
        </Button>
    );
}

function HoverActionsContainer(): JSX.Element {
    return (
        <ActionsContainer className="invisible group-hover:not-group-data-editing:visible">
            <IconButton iconName="three-dots-vertical" className="text-foreground"/>
        </ActionsContainer>
    );
}

function EditActionsContainer(): JSX.Element {
    return (
        <ActionsContainer>
            <IconButton iconName="check2" className="text-foreground"/>
            <IconButton iconName="x" className="text-foreground"/>
        </ActionsContainer>
    );
}

function DialogueItem({ actors, content, editing }: DialogueItemProps): JSX.Element {
    const formattedActorsString = useMemo(() => formatActorsArray(actors), [actors]);
    return (
        <HoverableSectionItem className="data-editing:before:bg-accent-100/20 data-editing:gap-y-2"
            data-editing={editing ? '' : undefined}>
            <HoverActionsContainer/>
            { editing && <EditActionsContainer/> }
            <div className="flex gap-x-2 items-center">
                {!editing ? (
                    <p className="font-semibold">
                        <FormattedStringView string={formattedActorsString}/>
                    </p>
                ) : (
                    <div className="flex gap-x-1">
                        { actors.map(actor => <ActorPill actorColor={actor.color} children={actor.name}/>) }
                        <AddActorButton/>
                    </div>
                )
                }
            </div>
            <div className="relative before:absolute before:-top-1 before:-left-2 before:-right-2 before:-bottom-1 before:rounded-lg before:border-accent-30 before:-z-1 data-editing:py-1 data-editing:before:bg-accent-10 data-editing:before:border"
                data-editing={editing ? '' : undefined}>
                <p className="whitespace-pre-wrap">
                    { content }
                </p>
            </div>
        </HoverableSectionItem>
    );
}

function ActionItem({ content, editing }: ScriptItemProps): JSX.Element {
    return (
        <HoverableSectionItem className="data-editing:before:bg-accent-100/20"
            data-editing={editing ? '' : undefined}>
            <HoverActionsContainer/>
            { editing && <EditActionsContainer/> }
            <div className="relative w-31/40 mx-auto before:absolute before:-top-1 before:-left-2 before:-right-2 before:-bottom-1 before:rounded-lg before:border-accent-30 before:-z-1 data-editing:py-1 data-editing:before:bg-accent-10 data-editing:before:border"
                data-editing={editing ? '' : undefined}
            >
                <p className="whitespace-pre-wrap">
                    { content }
                </p>
            </div>
        </HoverableSectionItem>
    );
}

function AddItemThing(): JSX.Element {
    return (
        <div className="relative">
            <div className="absolute px-6 flex gap-x-3 left-0 right-0 items-center -top-2 cursor-pointer group">
                <HLine className="flex-1 border-accent-100 invisible group-hover:visible"/>
                <Icon iconName="plus-circle" className="text-accent-100 invisible group-hover:visible"/>
                <HLine className="flex-1 border-accent-100 invisible group-hover:visible"/>
            </div>
        </div>
    );
}

const lipsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla sed malesuada justo. Aenean eget diam fringilla, tincidunt quam sed, eleifend odio. Morbi orci lorem, blandit non venenatis vitae, vulputate eget justo.`

const lorem = `Integer tincidunt sodales enim, quis pretium tellus sagittis non. Aliquam at consequat metus. Mauris nibh velit, viverra congue sapien eu, commodo imperdiet arcu.`;

function makeActors(...indecies: number[]): Actor[] {
    return indecies.map(idx => ({ name: testNames[idx], color: idx + 1 as Color }))
}

function SectionView(): JSX.Element {
    return (
        <section className="flex flex-col p-3 gap-y-2">
            <SectionInfoHeader/>
            <AddItemThing/>
            <SubsectionDivider name="1. Szene"/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(1, 2)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(3)} content={lipsum}/>
            <AddItemThing/>
            <ActionItem content={lorem} editing/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(4)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(5, 6, 7)} content={lipsum} editing/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
            <DialogueItem actors={makeActors(0)} content={lipsum}/>
            <AddItemThing/>
        </section>
    );
}

function ScriptContentView(): JSX.Element {
    return (
        <div className="flex flex-col flex-1 gap-y-4">
            <header className="flex mx-9 my-1">
                <SearchInput placeholder="Skript durchsuchen"/>
                <div className="flex gap-x-2 ms-auto">
                    <Tooltip label="Rückgängig">
                        <IconButton iconName="arrow-counterclockwise" render={<Tooltip.Trigger/>}/>
                    </Tooltip>
                    <Tooltip label="Kontext ausblenden">
                        <IconButton iconName="eye-slash" render={<Tooltip.Trigger/>}/>
                    </Tooltip>
                    <Tooltip label="Übersicht">
                        <IconButton iconName="list-nested" render={<Tooltip.Trigger/>}/>
                    </Tooltip>
                </div>
            </header>
            <HLine className="mx-9"/>
            <SectionView/>
        </div>
    );
}

function ScriptView(): JSX.Element {

    return (
        <div className="flex flex-col mx-auto gap-y-4 w-full max-w-343">
            <ScriptViewHeader/>
            <div className="flex flex-1 max-w-full">
                <ScriptContentView/>
                <div className="pointer-events-none">
                    <VLine className="absolute top-4 bottom-4 -z-2"/> 
                    <VLine className="relative border-background -z-1 -translate-y-196 h-200"/> 
                </div>
                <ScriptInfoView/>
            </div>
        </div>
    );
}

export default function(): JSX.Element {
    return (
        <div className="w-full flex flex-col sm:px-16 overflow-y-auto">
            <ScriptView/>
        </div>
    )
}

