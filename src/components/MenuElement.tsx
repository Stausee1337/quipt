import {
    ComponentProps,
    JSX,
    ValidComponent,
    For,
    createEffect,
    children,
    createMemo,
    createResource,
    createSignal,
    onCleanup,
    onMount,
    splitProps,
    useContext,
} from 'solid-js';
import { Dynamic, Portal } from 'solid-js/web';

import { A, useBeforeLeave } from '@solidjs/router';
import { useQuery } from '@tanstack/solid-query';
import { schemas } from 'qrpc-js';

import { useAuthentication } from 'quipt/client';
import { MakeEditableContent } from 'quipt/components/MakeEditableContent';
import { NewScriptFileChooser } from 'quipt/components/NewScriptFileChooser';
import { Popover } from 'quipt/components/Popover';
import QuiptLogo from 'quipt/components/Quipt-Logo';
import { useModal, useModalContext } from 'quipt/modals';
import { PartialScript, ScriptContextObj } from 'quipt/script';
import { Button, IconButton } from 'quipt/components/basics';

function MenuSlot<C extends ValidComponent>(
    props: ComponentProps<C> & {
        component: C;
        icon?: string;
    },
): JSX.Element {
    const [, rest] = splitProps(props, ['component', 'class', 'children']);

    return (
        <Dynamic
            component={props.component}
            class={`flex items-center p-2 ${props.class}`}
            {...rest}>
            {props.icon !== undefined ? <i class={`bi bi-${props.icon} mr-2`} /> : null}
            {props.children}
        </Dynamic>
    );
}

function ListItem(props: {
    icon?: string;
    children: JSX.Element;
    current?: boolean;
    href?: string;
    menuButton?: JSX.Element;
    onClick?: (e: MouseEvent) => void;
}): JSX.Element {
    const getChildren = children(() => props.children);
    const isSimpleContent = createMemo(() => typeof getChildren() === 'string');

    return (
        <MenuSlot
            component={props.href === undefined || !isSimpleContent() ? 'div' : A}
            icon={props.icon}
            onClick={props.onClick}
            href={props.href}
            class="hover:bg-accent1 rounded-lg"
            classList={{ 'bg-background': props.current }}>
            <div class="flex-1">{props.children}</div>
            {isSimpleContent() ? props.menuButton : null}
        </MenuSlot>
    );
}

function DeleteScriptModal(props: { script: PartialScript }): JSX.Element {
    const { dismiss, accept } = useModalContext()!;
    return (
        <>
            <div class="flex items-center">
                <h2 class="text-heading-2">Skript löschen?</h2>
                <IconButton class="ms-auto" icon="x" onClick={dismiss} />
            </div>
            <span>
                Dadurch wird <strong>{props.script.name}</strong> unwiederruflich gelöscht
            </span>
            <div class="bottom-line">
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
        <ul class="menu-options">
            <li onClick={props.deleteScript}>Löschen</li>
            <li onClick={props.renameScript}>Umbenennen</li>
        </ul>
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
            <button class="relative h-4.5 cursor-pointer text-lg/4.5 before:absolute before:-top-2 before:-right-2 before:h-[calc(100%+var(--spacing)*4)] before:w-[calc(100%+var(--spacing)*4)]">
                <i class="bi bi-three-dots" />
            </button>
        </Popover>
    );
}

function ScriptListItem(props: { script: PartialScript }): JSX.Element {
    const [isEditing, setIsEditing] = createSignal<boolean>(false);
    const [currentContent, setCurrentContent] = createSignal<string>(props.script.name);
    const scriptContext = useContext(ScriptContextObj)!;
    const openModal = useModal<schemas.UUID>();

    async function deleteScript() {
        const modalResult = await openModal(() => <DeleteScriptModal script={props.script} />);
        if (modalResult.type === 'accept') scriptContext.deleteScript(modalResult.result);
    }

    async function renameScript() {
        setIsEditing(true);
    }

    function onRenameDone() {
        setIsEditing(false);
        const newName = currentContent();
        if (newName === props.script.name || newName.length === 0) return;
        scriptContext.renameScript(props.script.uuid!, newName);
    }

    return (
        <MakeEditableContent
            component={ListItem}
            isEditable={isEditing()}
            onContentChange={setCurrentContent}
            onEditEnd={onRenameDone}

            href={`/script/${props.script.uuid}`}
            menuButton={
                <ScriptListItemMenuButton deleteScript={deleteScript} renameScript={renameScript} />
            }
            current={props.script.uuid === scriptContext.currentScript}>
            {currentContent()}
        </MakeEditableContent>
    );
}

export function SideMenu(props: { closer?: () => void }): JSX.Element {
    const authentication = useAuthentication()!;
    const openModal = useModal();

    const [user] = createResource(() => authentication.services!.user.get());
    const scriptsQuery = useQuery<PartialScript[]>(() => ({
        queryKey: ['scripts'],
    }));

    useBeforeLeave(() => {
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

    function createNewScript() {
        openModal(NewScriptFileChooser);
    }

    return (
        <nav class="bg-accent2 border-accent1 relative flex w-75 min-w-75 flex-col gap-1 overflow-hidden overflow-y-auto border-r px-2">
            <div class="border-accent1 sticky top-0 flex flex-col gap-1 border-b">
                <div class="flex h-15 items-center py-2">
                    {props.closer !== undefined ? (
                        <IconButton icon="x" class="ms-auto" onClick={props.closer} />
                    ) : (
                        <A class="mx-auto block" href="/">
                            <QuiptLogo />
                        </A>
                    )}
                </div>

                <ListItem icon="pencil-square" onClick={createNewScript}>
                    Neues Skript
                </ListItem>

                <h3 class="text-heading-3 px-2">Skripte</h3>
            </div>

            <div class="min-h-0 max-w-full flex-1">
                {scriptsQuery.status === 'success' && (
                    <For each={scriptsQuery.data.toSorted((a, b) => b.createdAt - a.createdAt)}>
                        {script => <ScriptListItem script={script} />}
                    </For>
                )}
            </div>

            {user.loading || user.error ? null : (
                <div class="footer">
                    <MenuSlot component="div" class="border-accent1 border-t" icon="person-circle">
                        <div class="flex-1">{user()!.username}</div>
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
    const [isRemoving, setIsRemoving] = createSignal(false);
    const [modalRoot, setModalRoot] = createSignal<HTMLDivElement>();

    createEffect(() => {
        if (props.isOpen) setIsRemoving(false);
    });

    createEffect(() => {
        // FIXME: ideally, giving the div an id is unnecessary
        const root = modalRoot();
        if (root !== undefined && root.isConnected) root.id = 'dialog-root';
    });

    // FIXME: currently the "floating-menu" container is bigger than the side menu itself, meaning
    // that the backdrop might be overshadowed by this invibisble container, and clicking on it
    // doesn't result in the menu being closed.
    return (
        <>
            {props.isOpen && (
                <Portal ref={setModalRoot} mount={document.body}>
                    <div id="floating-menu-backdrop" onClick={() => setIsRemoving(true)} />
                    <div
                        id="floating-menu"
                        classList={{ removing: isRemoving() }}
                        onAnimationEnd={isRemoving() ? () => props.onClose() : undefined}>
                        <SideMenu closer={() => setIsRemoving(true)} />
                    </div>
                </Portal>
            )}
        </>
    );
}
