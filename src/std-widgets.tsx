import { JSX, Ref, createEffect, createSignal, Accessor, mergeProps, onCleanup, onMount, useContext, getOwner } from "solid-js";
import { Dynamic } from "solid-js/web";
import { DialogManager } from "./dialog";
import { useAuthentication } from "./backend";
import { ScriptContextObj } from "./App";
import { A, useBeforeLeave } from "@solidjs/router";

export function ProgressSpinner(props: { size?: number, color?: string | undefined }) {
    const merged = mergeProps({ size: 100 }, props);

    const spinner = (
        <span class="progress-spinner">
            <svg viewBox="0 0 100 100" style={{height: `${merged.size}px`}}>
                <circle cx="50%" cy="50%" r="45"/>
            </svg>
        </span>
    ) as HTMLSpanElement;

    if (props.color !== undefined) {
        spinner.style.setProperty('--spinner-color', props.color);
    }
    return spinner;
}

type RippleEffectProps = {
    color?: string|undefined,
    onEnd?: () => void
    ref?: Ref<boolean>
    onClick?: JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>,
    alpha?: number
};

export function RippleEffect(props: RippleEffectProps) {
    const [animating, setAnimating] = createSignal(false);

    const container: HTMLDivElement =
        <div use:quiptClick class="ripple-effect-container"/>;
    container.style.setProperty('--ripple-bubble-color', props.color ?? null);
    container.style.setProperty('--ripple-alpha', props.alpha?.toString() ?? null);

    createEffect(() => {
        const ref = props.ref;
        typeof ref === "function" ? ref(animating()) : props.ref = animating();
    });

    async function containerPointerup() {
        const bubble: HTMLSpanElement = container.children[0];
        if (bubble === undefined) {
            return;
        }
        if (!bubble.classList.contains('animationend')) {
            await new Promise(resolve => {
                bubble.addEventListener('animationend', () => resolve(undefined));
            });
        }
        const animation = bubble.animate([
            { opacity: '0.2' },
            { opacity: '0' }
        ], { duration: 100 });
        animation.addEventListener('finish', () => {
            bubble.remove()
            props.onEnd && props.onEnd();
        });
    }
    
    function pointerDownEvent(event: PointerEvent) {
        if (container.children.length > 0) {
            return;
        }
        const rect = container.getBoundingClientRect();

        let clientX = event.clientX - rect.left;
        let clientY = event.clientY - rect.top;

        let size: number;
        if (rect.height >= rect.width) {
            size = rect.height;
        } else {
            size = rect.width;
        }
        size *= 2.2;

        clientX -= (size / 2);
        clientY -= (size / 2);

        const bubble: HTMLSpanElement = <span 
            class='ripple-bubble' 
            style={{left: `${clientX}px`, top: `${clientY}px`, 'width': `${size}px`}}
        />
        container.appendChild(bubble);
        container.addEventListener('animationend', () => {
            bubble.classList.add('animationend');
            setAnimating(false);
        });
        container.parentElement!.addEventListener('pointerup', containerPointerup, { once: true });
        container.parentElement!.addEventListener('pointerleave', containerPointerup, { once: true });
        setAnimating(true);
    }

    onMount(() => {
        container.addEventListener("pointerdown", pointerDownEvent)
        container.addEventListener("qpt-click", event => {
            if (props.onClick) {
                if (typeof props.onClick === "function") {
                    props.onClick(event as any);
                } else {
                    props.onClick[0](undefined, event as any);
                }
            }
        })
    })

    return container;
}

function ListElement(
    props: {
        icon?: string,
        children: JSX.Element,
        static?: boolean,
        current?: boolean,
        href?: string
    }
): JSX.Element {
    
    return (
        <Dynamic component={props.href === undefined ? 'span' : A}
            href={props.href}
            class="list-element"
            classList={{ static: props.static, current: props.current }}>
            { 
                props.icon !== undefined 
                    ? <i class={`bi bi-${props.icon}`}/> 
                    : null
            }
            { props.children }
        </Dynamic>
    );
}

export function MenuElement(
    props: {
        closer?: () => void
    }
): JSX.Element {
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


    return (
        <nav class="side-menu">
            <div class="header">
                <div class="top-line">
                    { closer !== undefined ? (
                        <button class="close" onClick={props.closer}>
                            <i class="bi bi-x"/>
                        </button> ) : null
                    }
                </div>

                <ListElement icon="pencil-square">Neues Skript</ListElement>

                <ListElement static>
                    <h3>Skripte</h3>
                </ListElement>
            </div>

            <div>
                 { 
                     (scripts.loading || scripts.error) ? null :
                         scripts()!.map(
                             v => (
                                 <ListElement href={`/script/${v.uuid}`}
                                    current={v.uuid === scriptContext.currentScript}>
                                 { v.name }
                                 </ListElement>))
                 }
            </div>

            {
                (user.loading || user.error) ? null :
                <div class="footer">
                    <ListElement icon="person-circle" static>
                        <span style="flex:1">{ user()!.username }</span>
                        <button class="secondary-button"
                            onClick={() => authentication.logout()}>
                            Logout
                        </button>
                    </ListElement>
                </div>
            }
        </nav>
    );
}

export function HeaderElement() {
    const authentication = useAuthentication()!;
    const owner = getOwner();

    function openMenu() {
        DialogManager.openSideMenu(MenuElement, owner);
    }

    return (
        <div class="header-element">
            {   
                authentication.isLoggedIn()
                    ? <button onClick={openMenu}><i class="bi bi-list"/></button>
                    : null
            }
            <h1>Quipt</h1>
        </div>
    );
}

export function quiptClick<T extends HTMLElement>
    (element: T, accessor?: Accessor<JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>>) {

    function handleEvent(event: MouseEvent) {
        const onClick = accessor?.();
        if (onClick !== true && onClick !== undefined) {
            if (typeof onClick === "function") {
                onClick(event as any);
            } else {
                onClick[0](undefined, event as any);
            }
        }
    }

    function dispatchEvent(srcEvent: PointerEvent) {
        const clickEvent = new PointerEvent("qpt-click", {
            bubbles: srcEvent.bubbles,
            cancelable: srcEvent.cancelable,
            composed: srcEvent.composed,

            detail: srcEvent.detail,
            view: srcEvent.view,
            which: srcEvent.which,

            altKey: srcEvent.altKey,
            ctrlKey: srcEvent.ctrlKey,
            metaKey: srcEvent.metaKey,
            modifierAltGraph: srcEvent.getModifierState("AltGraph"),
            modifierCapsLock: srcEvent.getModifierState("CapsLock"),
            modifierFn: srcEvent.getModifierState("Fn"),
            modifierFnLock: srcEvent.getModifierState("FnLock"),
            modifierHyper: srcEvent.getModifierState("Hyper"),
            modifierNumLock: srcEvent.getModifierState("NumLock"),
            modifierScrollLock: srcEvent.getModifierState("ScrolLock"),
            modifierSuper: srcEvent.getModifierState("Super"),
            modifierSymbol: srcEvent.getModifierState("Symbol"),
            modifierSymbolLock: srcEvent.getModifierState("SymbolLock"),
            shiftKey: srcEvent.shiftKey,

            button: srcEvent.button,
            buttons: srcEvent.buttons,
            clientX: srcEvent.clientX,
            clientY: srcEvent.clientY,
            movementX: srcEvent.movementX,
            movementY: srcEvent.movementY,
            relatedTarget: srcEvent.relatedTarget,
            screenX: srcEvent.screenX,
            screenY: srcEvent.screenY,
        });

        element.dispatchEvent(clickEvent);
    }


    let pointerIsDown = false;
    element.addEventListener('pointerdown', () => {
        pointerIsDown = true;
    })

    element.addEventListener('pointerup', event => {
        if (pointerIsDown) {
            pointerIsDown = false;
            dispatchEvent(event);
        }
    });

    function pointerCancel() {
        pointerIsDown = false; 
    }

    element.addEventListener('pointercancel', pointerCancel)
    element.addEventListener('pointerout', pointerCancel)
    element.addEventListener('pointerleave', pointerCancel)
    element.addEventListener('qpt-click', handleEvent);
}
