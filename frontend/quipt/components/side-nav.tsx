import { type JSX } from 'react';

import { Link } from 'react-router';

import { Icon } from 'quipt/components/icon';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';

export function SideNav(): JSX.Element {
    return (
        <div className="border-accent-30 flex h-full flex-col justify-between border-r p-3">
            <div className="flex flex-col gap-8">
                <Link to="/app" aria-label="Home">
                    <Icon iconName="quipt-q" className="icon-lg" aria-hidden="true" />
                </Link>
                <div className="flex flex-col gap-4">
                    <Tooltip label="Neues Skript" side="right" instant>
                        <IconButton
                            className="text-foreground"
                            iconName="pencil-square"
                            nativeButton={false}
                            render={
                                <Tooltip.Trigger
                                    delay={0}
                                    render={
                                        <Link
                                            to="/app/new-script"
                                            state={{ backgroundLocation: location.pathname }}
                                        />
                                    }
                                />
                            }
                        />
                    </Tooltip>

                    <Tooltip label="Üben" side="right" instant>
                        <IconButton
                            className="text-foreground"
                            iconName="chat-right-quote"
                            nativeButton={false}
                            render={
                                <Tooltip.Trigger
                                    delay={0}
                                    render={
                                        <Link
                                            to="/app/practice-start"
                                            state={{ backgroundLocation: location.pathname }}
                                        />
                                    }
                                />
                            }
                        />
                    </Tooltip>
                </div>
            </div>
            <div className="bg-text bg-foreground h-8 w-8 rounded-full"></div>
        </div>
    );
}
