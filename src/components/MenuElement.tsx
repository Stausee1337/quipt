import {
    ComponentProps,
    JSXElementConstructor,
    JSX,
    ReactNode,
    useEffect,
    useMemo,
    useState,
    onCleanup,
    onMount,
} from 'quipt/rexport';
import { createPortal } from 'react-dom';

import { Link, useBeforeUnload } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { schemas } from 'qrpc-js';
import classnames from 'classnames';

import { useAuthentication, userQueryOptions } from 'quipt/client';
import { MakeEditableContent } from 'quipt/components/MakeEditableContent';
import { Popover, PopoverMenuItem } from 'quipt/components/Popover';
import QuiptLogo from 'quipt/components/Quipt-Logo';
import { Modal, useModal, useModalContext } from 'quipt/modals';
import { PartialScript, scriptsQueryOptions, useDeleteScript, useRenameScript, useScriptParams } from 'quipt/script';
import { Button, IconButton } from 'quipt/components/basics';

type ComponentType = keyof JSX.IntrinsicElements | JSXElementConstructor<any>;

function MenuSlot<C extends ComponentType>(
    { component: Component, children, className, icon, ...rest }: ComponentProps<C> & {
        component: C;
        icon?: string;
    },
): JSX.Element {

    return (
        <Component
            className={classnames(
                'flex items-center p-2',
                className
            )}
            {...rest}>
            {icon !== undefined ? <i className={`bi bi-${icon} mr-2`} /> : null}
            {children}
        </Component>
    );
}

function ListItem({
    icon,
    children,
    current,
    to,
    menuButton,
    onClick,
}: {
    icon?: string;
    children: ReactNode;
    current?: boolean;
    to?: string;
    menuButton?: JSX.Element;
    onClick?: (e: MouseEvent) => void;
}): JSX.Element {
    const isSimpleContent = useMemo(() => typeof children === 'string', [children]);

    return (
        <MenuSlot
            component={to === undefined || !isSimpleContent ? 'div' : Link}
            icon={icon}
            onClick={onClick}
            to={to}
            className={classnames(
                'hover:bg-accent1 rounded-lg',
                current && 'bg-background'
            )}>
            <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {children}
            </div>
            {isSimpleContent ? menuButton : null}
        </MenuSlot>
    );
}

function DeleteScriptModal(props: { script: PartialScript }): JSX.Element {
    const { dismiss, accept } = useModalContext()!;
    return (
        <>
            <div className="flex items-center">
                <h2 className="text-heading-2">Skript löschen?</h2>
                <IconButton className="ms-auto" icon="x" onClick={dismiss} />
            </div>
            <span>
                Dadurch wird <strong>{props.script.name}</strong> unwiederruflich gelöscht
            </span>
            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={dismiss}>
                    Abbrechen
                </Button>
                <Button variant="danger" onClick={() => accept(props.script.uuid)}>
                    Löschen
                </Button>
            </div>
        </>
    );
}

function ScriptListItemPopoverMenu(props: {
    deleteScript: () => void;
    renameScript: () => void;
}): JSX.Element {
    return (
        <>
            <PopoverMenuItem onClick={props.deleteScript}>Löschen</PopoverMenuItem>
            <PopoverMenuItem onClick={props.renameScript}>Umbenennen</PopoverMenuItem>
        </>
    );
}

function ScriptListItemMenuButton(props: {
    deleteScript: () => void;
    renameScript: () => void;
}): JSX.Element {
    return (
        <Popover
            trigger="click"
            placement="bottom-start"
            content={<ScriptListItemPopoverMenu {...props} />}>
            <button className="relative h-4.5 cursor-pointer text-lg/4.5 before:absolute before:-top-2 before:-right-2 before:h-[calc(100%+var(--spacing)*4)] before:w-[calc(100%+var(--spacing)*4)]">
                <i className="bi bi-three-dots" />
            </button>
        </Popover>
    );
}

function ScriptListItem(props: { script: PartialScript }): JSX.Element {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentContent, setCurrentContent] = useState<string>(props.script.name);
    const scriptParams = useScriptParams();
    const deleteScriptMutation = useDeleteScript();
    const renameScriptMutation = useRenameScript();
    const [modalContext, openModal] = useModal<schemas.UUID>();

    async function deleteScript() {
        const modalResult = await openModal(<DeleteScriptModal script={props.script}/>);
        if (modalResult.type === 'accept') deleteScriptMutation.mutate({ scriptID: modalResult.result });
    }

    async function renameScript() {
        setIsEditing(true);
    }

    function onRenameDone() {
        setIsEditing(false);
        const name = currentContent;
        if (name === props.script.name || name.length === 0) return;
        renameScriptMutation.mutate({ scriptID: props.script.uuid!, name });
    }

    return (
        <>
            <Modal context={modalContext}/>
            <MakeEditableContent
                component={ListItem}
                isEditable={isEditing}
                onContentChange={setCurrentContent}
                onEditEnd={onRenameDone}

                to={`/script/${props.script.uuid}`}
                menuButton={
                    <ScriptListItemMenuButton deleteScript={deleteScript} renameScript={renameScript} />
                }
                current={props.script.uuid === scriptParams.scriptID}>
                {currentContent}
            </MakeEditableContent>
        </>
    );
}

export function SideMenu(props: { closer?: () => void }): JSX.Element {
    const authentication = useAuthentication()!;

    const user = useQuery(userQueryOptions(authentication));
    const scriptsQuery = useQuery(scriptsQueryOptions(authentication));

    useBeforeUnload(() => {
        props.closer?.();
    });

    let unsubscribe: (() => void) | undefined = undefined;
    onMount(() => {
        unsubscribe = authentication.onLogout.subscribe(() => {
            props.closer?.();
        });
    });
    onCleanup(() => {
        unsubscribe?.();
    });

    return (
        <nav className="bg-accent2 border-accent1 relative flex h-full w-75 max-w-[75vw] flex-col gap-1 overflow-hidden overflow-y-auto border-r px-2 select-none">
            <div className="border-accent1 sticky top-0 flex flex-col gap-1 border-b">
                <div className="flex h-15 items-center py-2">
                    {props.closer !== undefined ? (
                        <IconButton icon="x" className="ms-auto" onClick={props.closer} />
                    ) : (
                        <Link className="mx-auto block" to="/">
                            <QuiptLogo />
                        </Link>
                    )}
                </div>

                <ListItem icon="pencil-square">
                    Neues Skript
                </ListItem>

                <h3 className="text-heading-3 px-2">Skripte</h3>
            </div>

            <div className="min-h-0 max-w-full flex-1">
                {scriptsQuery.status === 'success' && (
                    scriptsQuery
                        .data
                        .toSorted((a, b) => b.createdAt - a.createdAt)
                        .map(script => <ScriptListItem script={script} key={script.name}/>)
                )}
            </div>

            {user.isLoading || user.isError || user.isPending ? null : (
                <div className="footer">
                    <MenuSlot component="div" className="border-accent1 border-t" icon="person-circle">
                        <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                            {user.data.username}
                        </div>
                        <Button variant="secondary" onClick={() => authentication.logout()}>
                            Logout
                        </Button>
                    </MenuSlot>
                </div>
            )}
        </nav>
    );
}

export function SideMenuModal(props: { isOpen: boolean; onClose: () => void }): JSX.Element {
    // TODO: relying on an animation system doesn't need an intermediate signal just to remove an
    // element
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        if (props.isOpen) setIsRemoving(false);
    });

    return (
        <>
            {props.isOpen && (
                createPortal(
                    <>
                        <div
                            className={classnames(
                                'fixed top-0 right-0 bottom-0 left-0 z-2000 bg-black/30',
                                !isRemoving && 'animate-floating-menu-bd-fade-in',
                                isRemoving && 'animate-floating-menu-bd-fade-out',
                            )}
                            onClick={() => setIsRemoving(true)}
                        />
                        <div
                            className={classnames(
                                'fixed top-0 left-0 z-2001 h-full',
                                !isRemoving && 'animate-floating-menu-enter',
                                isRemoving && 'animate-floating-menu-leave',
                            )}
                            onAnimationEnd={() => isRemoving && props.onClose()}>
                            <SideMenu closer={() => setIsRemoving(true)} />
                        </div>
                    </>,
                    document.body
                )
            )}
        </>
    );
}
