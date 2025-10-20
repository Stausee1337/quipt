import { Accessor, JSX, Setter, createContext, createDeferred, createMemo, createRenderEffect, createResource, createSignal, getOwner, onCleanup, runWithOwner, untrack, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";
import { A, useBeforeLeave } from "@solidjs/router";
import { useAuthentication } from "../client";
import { PartialScript, ScriptContextObj } from "../script";
import QuiptLogo from "./Quipt-Logo";
import { DialogManager } from "../dialog";
import { NewScriptFileChooser } from "./NewScriptFileChooser";
import { IsMobileContext } from "../App";
import { installContextMenuHandler, toggleMenu } from "../popover-menu";

interface ListElementStateContext {
    readonly elementKind: 'span'|'input';
    onBlur(event: Event): void;
    onMount(element: HTMLInputElement): void;
}

const ListElementStateContextObj = createContext<ListElementStateContext>();

function createListElementContext(): [ListElementStateContext, (update: (value: string) => void) => void] { 
    const owner = getOwner()!;
    const [state, setState] = createSignal<ListElementStateContext>();

    const ctx: ListElementStateContext = {
        get elementKind(): 'span'|'input' {
            return state()?.elementKind ?? 'span';
        },
        onBlur(event) {
            state()?.onBlur(event);
        },
        onMount(element) { 
            state()?.onMount(element);
        },
    };

    function createOwnedComputation<T>(data: Accessor<T>): T {
        return runWithOwner(owner, () => createMemo(data)())!;
    }

    function createEditableState(update: Setter<string>) {
        const state = createOwnedComputation<ListElementStateContext>(() => {
            const [element, setElement] = createSignal<HTMLInputElement>();
            const [value, setValue] = createSignal<string>();

            createDeferred(() => {
                const result = value();
                if (result !== undefined) {
                    setState(undefined);
                    update(result);
                }
            })

            return {
                get elementKind(): 'span'|'input' {
                    return value() === undefined ? 'input' : 'span';
                },
                onBlur() {
                    const stateElement = untrack(element);
                    if (stateElement !== undefined)
                        setValue(p => p ?? stateElement.value);
                },
                onMount(element) {
                    setElement(p => p ?? element);
                    element.select();
                }
            };
        });
        setState(state);
        return state;
    }

    return [ctx, createEditableState];
}

function ListElement(
    props: {
        icon?: string,
        children: string,
        static?: boolean,
        current?: boolean,
        href?: string,
        menuButton?: JSX.Element,
        onClick?: (e: MouseEvent) => void,
        onUpdate?: (value: string) => void
    }
): JSX.Element {
    const elementState = useContext(ListElementStateContextObj);
    const [elementRef, setElmentRef] = createSignal<HTMLSpanElement|HTMLImageElement>();

    createRenderEffect(() => {
        const ref = elementRef();
        if (ref instanceof HTMLInputElement)
            elementState?.onMount(ref);
    })


    return (
        <Dynamic component={(props.href === undefined || (elementState?.elementKind ?? 'span') !== 'span') ? 'span' : A}
            onClick={props.onClick}
            href={props.href}
            class="list-element"
            classList={{ static: props.static, current: props.current }}>
            { 
                props.icon !== undefined 
                    ? <i class={`bi bi-${props.icon}`}/> 
                    : null
            }
            <Dynamic ref={setElmentRef}
                component={elementState?.elementKind ?? 'span'}
                {...(elementState?.elementKind === 'input'
                    ? { value: String(props.children), onBlur: elementState.onBlur }
                    : { children: props.children}) }/>
            { elementState?.elementKind !== 'input' ? props.menuButton : null }
        </Dynamic>
    );
}

function DeleteScriptDialog(
    { script, closer }: {
        script: PartialScript,
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

function ScriptContextMenu(): JSX.Element {
    const elementContext = useContext(ScriptElementContextObj)!;
    return (
        <ul class="menu-options">
            <li onClick={elementContext.deleteScript}>Löschen</li>
            <li onClick={elementContext.renameScript}>Umbenennen</li>
        </ul>
    );
}

function ScriptMenuButton(): JSX.Element {
    const button = (
        <button class="icon-menu-button" onClick={toggleMenu}>
            <i class="bi bi-three-dots"/> 
        </button>
    ) as HTMLButtonElement;

    installContextMenuHandler(
        button,
        "bottom-start",
        ScriptContextMenu,
        {}
    );

    return button;
}

interface ScriptElementContext {
    deleteScript(): void;
    renameScript(): void;
}

const ScriptElementContextObj = createContext<ScriptElementContext>();

function EditableScriptElement(
    props: {
        children?: JSX.Element,
        script: PartialScript
    }
): JSX.Element {
    const scriptContext = useContext(ScriptContextObj)!;
    const [listElementContext, makeElementEditable] = createListElementContext();

    const context : ScriptElementContext = {
        async deleteScript() {
            const deleteUuid = await DialogManager.openDialog<string>(
                ({ closer }) => <DeleteScriptDialog closer={closer} script={props.script}/>);
            if (deleteUuid !== undefined)
                scriptContext.deleteScript(deleteUuid);
        },
        async renameScript() {
            makeElementEditable(newValue => {
                if (newValue === props.script.name || newValue.length === 0)
                    return;
                scriptContext.renameScript(props.script.uuid!, newValue);
            });
        }
    };

    return (
        <ScriptElementContextObj.Provider value={context}>
            <ListElementStateContextObj.Provider value={listElementContext}>
                { props.children }
            </ListElementStateContextObj.Provider>
        </ScriptElementContextObj.Provider>
    );
}

export function MenuElement(
    props: {
        closer?: () => void
    }
): JSX.Element {
    const owner = getOwner()!;
    const isMobile = useContext(IsMobileContext)!;
    const authentication = useAuthentication()!;
    const scriptContext = useContext(ScriptContextObj)!;

    const closer = props.closer;

    const [user] = createResource(() => authentication.services!.user.get());
    const scripts = scriptContext.allScripts;

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
            return (
                <EditableScriptElement script={script}>
                    <ListElement href={`/script/${script.uuid}`}
                        menuButton={<ScriptMenuButton/>}
                        current={script.uuid === scriptContext.currentScript}>
                        { script.name! }
                    </ListElement>
                </EditableScriptElement>
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

                <ListElement icon="pencil-square"
                    {...(isMobile() ? { href: '/new-script' } : { onClick: createNewScript })}>
                    Neues Skript
                </ListElement>

                <h3 style={{padding: '1rem'}}>Skripte</h3>
            </div>

            <div style={{'min-width': '0', 'max-width': '100%'}}>
                 {
                     scripts()!
                        .toSorted((a, b) => b.createdAt - a.createdAt)
                        .map(renderScriptElement)
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
