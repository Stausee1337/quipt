import { type ComponentProps, type JSX, type ReactNode } from 'react';

import { Button } from '@base-ui/react'
import classnames from 'classnames';

import { type Color } from 'quipt/color-palette';
import { Icon } from 'quipt/components/icon';
import { ActorPill } from 'quipt/components/actor-pill';
import { SearchInput } from 'quipt/components/input';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';

function HLine({ className, ...props }: ComponentProps<'div'>): JSX.Element {
    return <div 
        className={classnames(
            'border-accent-30 border-b-1',
            className,
        )}
        {...props}/>;
}

function VLine({ className, ...props }: ComponentProps<'div'>): JSX.Element {
    return <div 
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
            className={classnames('flex items-center info text-accent-100', className)}
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
                <p className="info text-accent-100">@Maxl</p>
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

function ScriptContentView(): JSX.Element {
    return (
        <section className="flex flex-col p-3 gap-y-4">
            <header className="relative flex flex-col px-6 gap-y-3 before:absolute before:left-0 before:right-0 before:-top-2 before:-bottom-2 before:rounded-xl hover:before:bg-accent-100/20">
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
            <div className="flex px-6 items-center gap-x-3">
                <HLine className="flex-1"/>
                <span className="info text-accent-100">1. Szene</span>
                <HLine className="flex-1"/>
            </div>
        </section>
    );
}

function ScriptView(): JSX.Element {

    return (
        <div className="flex flex-col mx-auto gap-y-4 min-h-full w-full max-w-343">
            <ScriptViewHeader/>
            <div className="flex flex-1 max-w-full">

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
                    <ScriptContentView/>
                </div>
                <VLine className="my-4"/> 
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

