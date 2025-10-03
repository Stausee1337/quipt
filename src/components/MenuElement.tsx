import { JSX, getOwner, onCleanup, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";
import { A, useBeforeLeave } from "@solidjs/router";
import { scripts, useAuthentication } from "../backend";
import { ScriptContext, ScriptContextObj } from "../script";
import QuiptLogo from "./Quipt-Logo";
import { DialogManager } from "../dialog";
import { NewScriptFileChooser } from "./NewScriptFileChooser";
import { IsMobileContext } from "../App";
import { installContextMenuHandler, toggleMenu } from "../popover-menu";

function ListElement(
    props: {
        icon?: string,
        children: JSX.Element,
        static?: boolean,
        current?: boolean,
        href?: string,
        menuButton?: JSX.Element
        onClick?: (e: MouseEvent) => void,
    }
): JSX.Element {
    
    return (
        <Dynamic component={props.href === undefined ? 'span' : A}
            onClick={props.onClick}
            href={props.href}
            class="list-element"
            classList={{ static: props.static, current: props.current }}>
            { 
                props.icon !== undefined 
                    ? <i class={`bi bi-${props.icon}`}/> 
                    : null
            }
            <span>{ props.children }</span>
            { props.menuButton }
        </Dynamic>
    );
}

function DeleteScriptDialog(
    { script, closer }: {
        script: scripts.IScript,
        closer: (res: string|undefined) => void
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
                <button class="red-button" onClick={() => closer(script.uuid!)}>Löschen</button>
            </div>
        </>
    );
}

function ScriptContextMenu(
    props: {
        script: scripts.IScript,
        scriptContext: ScriptContext
    }
): JSX.Element {
    async function deleteScript() {
        const deleteUuid = await DialogManager.openDialog<string>(
            ({ closer }) => <DeleteScriptDialog closer={closer} script={props.script}/>);
        if (deleteUuid !== undefined)
            props.scriptContext.deleteScript(deleteUuid);
    }

    return (
        <ul class="menu-options">
            <li onClick={deleteScript}>Löschen</li>
            <li>Umbenennen</li>
        </ul>
    );
}

function ScriptMenuButton(
    { script }: {
        script: scripts.IScript
    }
): JSX.Element {
    const scriptContext = useContext(ScriptContextObj)!;
    const button = (
        <button class="icon-menu-button" onClick={toggleMenu}>
            <i class="bi bi-three-dots"/> 
        </button>
    ) as HTMLButtonElement;

    installContextMenuHandler(
        button,
        "bottom-start",
        ScriptContextMenu,
        { script, scriptContext }
    );

    return button;
}

export function MenuElement(
    props: {
        closer?: () => void
    }
): JSX.Element {
    const owner = getOwner()!;
    const isMobile = useContext(IsMobileContext)!;
    const authentication = useAuthentication()!;
    const closer = props.closer;
    const [user, {}] = authentication.requests!.getCached("/get-user");
    const [scripts , {}] = authentication.requests!.getCached("/list-scripts");
    const scriptContext = useContext(ScriptContextObj)!;

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

                <ListElement icon="pencil-square"
                    {...(isMobile() ? { href: '/new-script' } : { onClick: createNewScript })}>
                    Neues Skript
                </ListElement>

                <ListElement static>
                    <h3>Skripte</h3>
                </ListElement>
            </div>

            <div style={{'min-width': '0', 'max-width': '100%'}}>
                 { 
                     (scripts.loading || scripts.error) ? null :
                         scripts()!
                            .toSorted((a, b) => b.createdAt - a.createdAt)
                            .map(v => (
                                 <ListElement href={`/script/${v.uuid}`}
                                    menuButton={<ScriptMenuButton script={v}/>}
                                    current={v.uuid === scriptContext.currentScript}>
                                    { v.name }
                                 </ListElement>))
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
                        <span style="flex:1">{ user()!.username }</span>
                    </ListElement>
                </div>
            }
        </nav>
    );
}
