import { type JSX } from 'react';

import { Link } from 'react-router';

import { Icon } from 'quipt/components/icon';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip as Tooltip2 } from 'quipt/components/tooltip';

export function SideNav(): JSX.Element {
    return (
        <div className="flex flex-col justify-between h-full border-accent-30 border-r p-3">
            <div className="flex flex-col gap-8">
                <Link to="/app">
                    <Icon iconName="quipt-q" className="icon-lg"/>
                </Link>
                <div className="flex flex-col gap-4">
                    <Tooltip2 label="Neues Skript" side="right">
                        <IconButton className="text-foreground"
                            iconName="pencil-square"
                            nativeButton={false}
                            render={<Tooltip2.Trigger
                                render={<Link to={{ hash: '#create-script' }}/>}/>}
                        />
                    </Tooltip2>

                    <Tooltip2 label="Üben" side="right">
                        <IconButton className="text-foreground"
                            iconName="chat-right-quote"
                            nativeButton={false}
                            render={<Tooltip2.Trigger
                                render={<Link to={{ hash: '#training-start' }}/>}/>}
                        />
                    </Tooltip2>
                </div>
            </div>
            <div className="bg-text w-8 h-8 bg-foreground rounded-full">

            </div>
        </div>
    );
}

