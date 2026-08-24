import { JSX, children, createMemo, createResource, createSignal, getOwner, onCleanup, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";
import { A, useBeforeLeave } from "@solidjs/router";
import { useAuthentication } from "../client";
import { PartialScript, ScriptContextObj } from "../script";
import QuiptLogo from "./Quipt-Logo";
import { DialogManager } from "../dialog";
import { NewScriptFileChooser } from "./NewScriptFileChooser";
import { installPopoverMenuHandler, toggleMenu } from "../popover-menu";
import { schemas } from "qrpc-js";
import { useQuery } from "@tanstack/solid-query";
import { MakeEditableContent } from "./MakeEditableContent";

function Fragment(
    props: { children: JSX.Element }
): JSX.Element {
    const getChildren = children(() => props.children);

    return (() => {
        return getChildren.toArray();
    }) as unknown as JSX.Element;
}

function ListElement(
    props: {
        icon?: string,
        children: JSX.Element,
        static?: boolean,
        current?: boolean,
        href?: string,
        menuButton?: JSX.Element,
        onClick?: (e: MouseEvent) => void,
        onUpdate?: (value: string) => void
    }
): JSX.Element {
    // const elementState = useContext(ListElementStateContextObj);
    // const [elementRef, setElmentRef] = createSignal<HTMLSpanElement|HTMLImageElement>();

    // createRenderEffect(() => {
    //     const ref = elementRef();
    //     if (ref instanceof HTMLInputElement)
    //         elementState?.onMount(ref);
    // })
    //
    //
    const getChildren = children(() => props.children);
    const isSimpleContent = createMemo(() => typeof getChildren() === "string")

    return (
        <Dynamic component={(props.href === undefined || !isSimpleContent()) ? 'span' : A}
            onClick={props.onClick}
            href={props.href}
            class="list-element"
            classList={{ static: props.static, current: props.current }}>
            { 
                props.icon !== undefined 
                    ? <i class={`bi bi-${props.icon}`}/> 
                    : null
            }
            <Dynamic
                component={isSimpleContent() ? 'span' : Fragment}>
                { props.children }
            </Dynamic>
            { isSimpleContent() ? props.menuButton : null }
        </Dynamic>
    );
}

function DeleteScriptDialog(
    { script, closer }: {
        script: PartialScript,
        closer: (res: schemas.UUID|undefined) => void
    }
): JSX.Element {
    return (
        <>
            <button class="close" onClick={() => closer(undefined)}>
                <i class="bi bi-x"/>
            </button>
            <h2>Skript löschen?</h2>
            <span>Dadurch wird <strong>{ script.name }</strong> unwiederruflich gelöscht</span>
            <div class="bottom-line">
                <button class="secondary-button" onClick={() => closer(undefined)}>Abbrechen</button>
                <button class="red-button" onClick={() => closer(script.uuid)}>Löschen</button>
            </div>
        </>
    );
}

function ScriptContextMenu(
    props: { 
        deleteScript: () => void;
        renameScript: () => void;
    }
): JSX.Element {
    // const elementContext = useContext(ScriptElementContextObj)!;
    return (
        <ul class="menu-options">
            <li onClick={props.deleteScript}>Löschen</li>
            <li onClick={props.renameScript}>Umbenennen</li>
        </ul>
    );
}

function ScriptMenuButton(
    props: {
        deleteScript: () => void;
        renameScript: () => void;
    }
): JSX.Element {
    const button = (
        <button class="icon-menu-button" onClick={toggleMenu}>
            <i class="bi bi-three-dots"/> 
        </button>
    ) as HTMLButtonElement;

    installPopoverMenuHandler(
        button,
        "bottom-start",
        ScriptContextMenu,
        props
    );

    return button;
}


export function MenuElement(
    props: {
        closer?: () => void
    }
): JSX.Element {
    const owner = getOwner()!;
    const authentication = useAuthentication()!;
    const scriptContext = useContext(ScriptContextObj)!;

    const closer = props.closer;

    const [user] = createResource(() => authentication.services!.user.get());
    const scriptsQuery = useQuery<PartialScript[]>(() => ({ queryKey: ['scripts'] }));

    if (closer !== undefined) {
        useBeforeLeave(() => {
            closer();
        })
        const unsubscribe = authentication.onLogout.subscribe(() => {
            closer();
        });
        onCleanup(() => {
            unsubscribe();
        })
    }

    function createNewScript() {
        DialogManager.openDialog<void>(NewScriptFileChooser, owner);
    }

    function closeButton(): JSX.Element {
        return (
            <button class="close" onClick={props.closer}>
                <i class="bi bi-x"/>
            </button>
        )
    }

    function renderScriptElement(script: PartialScript): JSX.Element {
        return createMemo(() => {
            const [isEditing, setIsEditing] = createSignal<boolean>(false);
            const [currentContent, setCurrentContent] = createSignal<string>(script.name);

            async function deleteScript() {
                const deleteUuid = await DialogManager.openDialog<schemas.UUID>(
                    ({ closer }) => <DeleteScriptDialog closer={closer} script={script}/>);
                if (deleteUuid !== undefined)
                    scriptContext.deleteScript(deleteUuid);
            }

            async function renameScript() {
                setIsEditing(true);
            }

            function onRenameDone() {
                setIsEditing(false);
                const newName = currentContent();
                if (newName === script.name || newName.length === 0)
                    return;
                scriptContext.renameScript(script.uuid!, newName);
            }

            return (
                <MakeEditableContent component={ListElement}
                    isEditable={isEditing()}
                    onContentChange={setCurrentContent}
                    onEditEnd={onRenameDone}

                    href={`/script/${script.uuid}`}
                    menuButton={<ScriptMenuButton deleteScript={deleteScript} renameScript={renameScript}/>}
                    current={script.uuid === scriptContext.currentScript}>
                    { currentContent() }
                </MakeEditableContent>
            );
        }) as any;
    }

    return (
        <nav class="side-menu">
            <div class="header">
                <div class="top-line">
                    {
                        closer !== undefined 
                            ? closeButton()
                            : <A href="/" style={{color: 'inherit'}}>
                                <QuiptLogo/>
                            </A>
                    }
                </div>

                <ListElement icon="pencil-square" onClick={createNewScript}>
                    Neues Skript
                </ListElement>

                <h3 style={{padding: '1rem'}}>Skripte</h3>
            </div>

            <div style={{'min-width': '0', 'max-width': '100%'}}>
                 {
                     scriptsQuery.status === "success" && (
                         scriptsQuery.data
                            .toSorted((a, b) => b.createdAt - a.createdAt)
                            .map(renderScriptElement)
                     )
                 }
            </div>

            {
                (user.loading || user.error) ? null :
                <div class="footer">
                    <ListElement static
                        icon="person-circle"
                        menuButton={
                            <button class="secondary-button"
                                onClick={() => authentication.logout()}>
                                Logout
                            </button>
                        }>
                        { user()!.username }
                    </ListElement>
                </div>
            }
        </nav>
    );
}
