import {
    JSX,
    children,
    createMemo,
    createResource,
    createSignal,
    onCleanup,
    onMount,
    useContext,
} from 'solid-js';
import { For } from 'solid-js';
import { createEffect } from 'solid-js';
import { Dynamic, Portal } from 'solid-js/web';

import { A, useBeforeLeave } from '@solidjs/router';
import { useQuery } from '@tanstack/solid-query';
import { schemas } from 'qrpc-js';

import { useAuthentication } from 'quipt/client';
import { MakeEditableContent } from 'quipt/components/MakeEditableContent';
import { NewScriptFileChooser } from 'quipt/components/NewScriptFileChooser';
import QuiptLogo from 'quipt/components/Quipt-Logo';
import { useModal, useModalContext } from 'quipt/modals';
import { installPopoverMenuHandler, toggleMenu } from 'quipt/popover-menu';
import { PartialScript, ScriptContextObj } from 'quipt/script';

function Fragment(props: { children: JSX.Element }): JSX.Element {
    const getChildren = children(() => props.children);

    return <>{getChildren()}</>;
}

function ListItem(props: {
    icon?: string;
    children: JSX.Element;
    static?: boolean;
    current?: boolean;
    href?: string;
    menuButton?: JSX.Element;
    onClick?: (e: MouseEvent) => void;
    onUpdate?: (value: string) => void;
}): JSX.Element {
    const getChildren = children(() => props.children);
    const isSimpleContent = createMemo(() => typeof getChildren() === 'string');

    return (
        <Dynamic
            component={props.href === undefined || !isSimpleContent() ? 'span' : A}
            onClick={props.onClick}
            href={props.href}
            class="list-element"
            classList={{ static: props.static, current: props.current }}>
            {props.icon !== undefined ? <i class={`bi bi-${props.icon}`} /> : null}
            <Dynamic component={isSimpleContent() ? 'span' : Fragment}>{props.children}</Dynamic>
            {isSimpleContent() ? props.menuButton : null}
        </Dynamic>
    );
}

function DeleteScriptModal(props: { script: PartialScript }): JSX.Element {
    const { dismiss, accept } = useModalContext()!;
    return (
        <>
            <button class="close" onClick={() => dismiss()}>
                <i class="bi bi-x" />
            </button>
            <h2>Skript löschen?</h2>
            <span>
                Dadurch wird <strong>{props.script.name}</strong> unwiederruflich gelöscht
            </span>
            <div class="bottom-line">
                <button class="secondary-button" onClick={() => dismiss()}>
                    Abbrechen
                </button>
                <button class="red-button" onClick={() => accept(props.script.uuid)}>
                    Löschen
                </button>
            </div>
        </>
    );
}

function ScriptContextMenu(props: {
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
    let button: HTMLButtonElement | undefined = undefined;

    onMount(() => {
        button && installPopoverMenuHandler(button, 'bottom-start', ScriptContextMenu, props);
    });

    return (
        <button ref={button} class="icon-menu-button" onClick={toggleMenu}>
            <i class="bi bi-three-dots" />
        </button>
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
        <nav class="side-menu">
            <div class="header">
                <div class="top-line">
                    {props.closer !== undefined ? (
                        <button class="close" onClick={props.closer}>
                            <i class="bi bi-x" />
                        </button>
                    ) : (
                        <A href="/" style={{ color: 'inherit' }}>
                            <QuiptLogo />
                        </A>
                    )}
                </div>

                <ListItem icon="pencil-square" onClick={createNewScript}>
                    Neues Skript
                </ListItem>

                <h3 style={{ padding: '1rem' }}>Skripte</h3>
            </div>

            <div style={{ 'min-width': '0', 'max-width': '100%' }}>
                {scriptsQuery.status === 'success' && (
                    <For each={scriptsQuery.data.toSorted((a, b) => b.createdAt - a.createdAt)}>
                        {script => <ScriptListItem script={script} />}
                    </For>
                )}
            </div>

            {user.loading || user.error ? null : (
                <div class="footer">
                    <ListItem
                        static
                        icon="person-circle"
                        menuButton={
                            <button
                                class="secondary-button"
                                onClick={() => authentication.logout()}>
                                Logout
                            </button>
                        }>
                        {user()!.username}
                    </ListItem>
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
