import { Component, JSX, ParentProps, Ref, createComponent, createContext, createEffect, createSignal, Accessor, mergeProps, onCleanup, onMount, useContext } from "solid-js";
import { untrack } from "solid-js/web";
import { $, Observable } from "./observable";
import { DialogManager } from "./dialog";
import { useAuthentication } from "./backend";

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

export type ListItemProps = {
    heading: string,
    icon: string | Element,
    description?: string,
    onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>,
};

export function ListItem(props: ParentProps<ListItemProps>) {
    const controller = useContext(ListViewContext);
    const thisItemIndex = controller?.itemIndex;
    
    const [isSelected, setIsSelected] = createSignal(false);
    const listViewMode = controller != null ? $(controller.mode) : () => ListViewMode.default;

    controller?.mode.subscribe(updateSelected);
    controller?.addEventListener('selectedchange', updateSelected);

    const iconElement = typeof props.icon === "string" ? 
            <i class={`bi bi-${props.icon}`}/> : props.icon;
    let timeout: number;

    function updateSelected() {
       setIsSelected(controller?.isItemSelected(thisItemIndex!) ?? false);
    }

    let element: HTMLDivElement = undefined!;
    let wasLongPress = false;
    function onLongPress() {
        controller?.setSelected(thisItemIndex!);
        wasLongPress = true;
    }

    function pointerDown() {
        timeout = setTimeout(onLongPress, 500);
    }

    function pointerUp() {
        clearTimeout(timeout);
    }

    function onClick(event: MouseEvent) {
        if (isSelected()) {
            controller!.unsetSelected(thisItemIndex!);
            wasLongPress = false;
            return;
        }
        if (listViewMode() === ListViewMode.default) {
            if (typeof props.onClick === "function") {
                props.onClick(event as any);
            } else if (props.onClick !== undefined) {
                props.onClick[0](null, event as any);
            }
        } else {
            controller!.setSelected(thisItemIndex!);
        }
    }

    function DeferRippleRemove(props: { visible: boolean }): JSX.Element {
        const [shouldDisplay, setShouldDisplay] = createSignal(props.visible);
        let animating = false;
        createEffect(() => {
            if (animating && !props.visible) {
                return;
            }
            setShouldDisplay(props.visible);
        })
        function onEnd() {
            setShouldDisplay(props.visible);
        }
        return <>{ shouldDisplay() ? <RippleEffect ref={animating} onEnd={onEnd}/> : null}</>;
    }


    return (
        <div class="list-item"
            ref={element}
            classList={{'selected': isSelected()}}
            onClick={onClick}
            onPointerDown={controller !== null ? pointerDown : undefined}
            onPointerUp={controller !== null ? pointerUp : undefined}
            onPointerLeave={controller !== null ? pointerUp : undefined}>
            <div class="always-content">
                <span class="icon-container" children={iconElement}/> 
                <div class="content">
                    <h1>{ props.heading }</h1>
                    { props.description !== undefined ? <span children={props.description}/> : null }
                </div>
            </div>
            { <DeferRippleRemove visible={!isSelected()}/> }
            { props.children ?  props.children : null }
        </div>
    );
}

export enum ListViewMode {
    default,
    selecting
}

export class ListViewController implements EventTarget {
    public isEmpty = new Observable(true);
    public mode = new Observable<ListViewMode>(ListViewMode.default);
    public itemIndex = -1;

    private _items: any[] = [];
    private _selectedItems = new Set<number>();
    private _registeredEvents = new Map<string, Set<EventListenerOrEventListenerObject>>();

    public deleteHandler: ((items: any[]) => void)|undefined = undefined;

    public updateItems(items: any[]) {
        this._items = items;
        this.isEmpty.set(items.length == 0);
    }

    public setSelected(itemIndex: number) {
        this._selectedItems.add(itemIndex);
        this.mode.set(ListViewMode.selecting);
        const selectedchangeEvent = new Event('selectedchange');
        this.dispatchEvent(selectedchangeEvent);
    }

    public unsetSelected(itemIndex: number) {
        this._selectedItems.delete(itemIndex);
        const selectedchangeEvent = new Event('selectedchange');
        this.dispatchEvent(selectedchangeEvent);
        if (this._selectedItems.size === 0) {
            this.mode.set(ListViewMode.default);
        }
    }

    public isItemSelected(itemIndex: number): boolean {
        return this._selectedItems.has(itemIndex);
    }

    public unselect() {
        this._selectedItems.clear();
        this.mode.set(ListViewMode.default);
        const selectedchangeEvent = new Event('selectedchange');
        this.dispatchEvent(selectedchangeEvent);
    }

    public getSelected(): any[] {
        return Array.from(this._selectedItems).map(index => this._items[index]);
    }

    public removeSelected() {
        this.deleteHandler && this.deleteHandler(this.getSelected())
        this.unselect();
    }

    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, _options?: boolean | AddEventListenerOptions | undefined): void { 
        if (callback === null) {
            return;
        }
        let listeners: Set<EventListenerOrEventListenerObject> = this._registeredEvents.get(type)!;
        if (listeners === undefined) {
            listeners = new Set<EventListenerOrEventListenerObject>();
            this._registeredEvents.set(type, listeners);
        }
        listeners.add(callback);
    }

    dispatchEvent(event: Event): boolean {
        const listeners = this._registeredEvents.get(event.type) ?? new Set<EventListenerOrEventListenerObject>();
        let defaultPrevented = false;
        for (let listener of listeners) {
            if (typeof listener === "function") {
                listener(event);
            } else {
                listener.handleEvent(event);
            }
            defaultPrevented = defaultPrevented || event.defaultPrevented;
        }
        return defaultPrevented;
    }

    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, _options?: boolean | EventListenerOptions | undefined): void {  
        if (callback === null) {
            return;
        }
        const listeners = this._registeredEvents.get(type) ?? new Set<EventListenerOrEventListenerObject>();
        listeners.delete(callback);
    }
}

const ListViewContext = createContext<ListViewController|null>(null);

type ListViewProps = ParentProps<{
    ref?: Ref<ListViewController>
    items: any[],
    map: (item: any) => JSX.Element,
    influencesHeader?: boolean|undefined
    onDelete?: (items: any[]) => void
}>;

type NamespacedComponent<T> = Component<T> & {
    Empty: Component<ParentProps>
};

export const ListView: NamespacedComponent<ListViewProps> = (props) => {
    const controller = new ListViewController();
    controller.updateItems(props.items);

    const headerController = props.influencesHeader ? useContext(HeaderContext) : undefined;

    createEffect(() => {
        controller.updateItems(props.items);
    })

    createEffect(() => {
        controller.deleteHandler = props.onDelete;
    })

    onMount(() => {
        headerController?.register(controller);
    });

    onCleanup(() => {
        headerController?.unregister(controller);
    });

    const ref = props.ref;
    typeof ref === "function" ? untrack(() => ref(controller)) : props.ref = controller;
    return (
        <ListViewContext.Provider value={controller}>
            { props.children }
            <div class="scrollable">
                <div class="list-view">
                    { props.items.map(adjustItemIndex(controller, props.map)) }
                </div>
            </div>
        </ListViewContext.Provider>
    );
};

function adjustItemIndex(controller: ListViewController, fn: (item: any) => JSX.Element): (item: any) => JSX.Element {
    controller.itemIndex = -1;
    return (item) => {
        controller.itemIndex++;
        return createComponent(fn, item);
    };
}

ListView.Empty = (props) => {
    const controller = useContext(ListViewContext);
    if (controller === null) {
        throw 'Empty has to be placed within a list view';
    }
    const isEmpty = $(controller.isEmpty);
    return <>{isEmpty() ? props.children : null}</>;
};

class HeaderController {
    public mode = new Observable<"default"|"list">("default");
    public amountSelected = new Observable(0);
    
    private _associatedListView: ListViewController|null = null;
    private _unsubscribe: (() => void)|undefined = undefined;

    public listViewUnselect() {
        if (this._associatedListView === null) {
            throw 'No ListView associated';
        }
        this._associatedListView.unselect();
    }

    public register(listView: ListViewController) {
        if (this._associatedListView !== null) {
            throw 'Some ListView already associated';
        }
        this._associatedListView = listView;
        this._unsubscribe = this._associatedListView.mode.subscribe(this._listModeChanged.bind(this));
        this._associatedListView.addEventListener('selectedchange', this._listSelectedChanged.bind(this));
    }

    public unregister(listView: ListViewController) {
        if (this._associatedListView === null) {
            throw 'No ListView associated';
        }
        if (this._associatedListView !== listView) {
            throw 'Cant detach foreign ListView';
        }
        this._unsubscribe && this._unsubscribe();
        this._associatedListView.removeEventListener('selectedchange', this._listSelectedChanged.bind(this));
        this._associatedListView = null;
        this.mode.set("default");
    }

    public async delete(): Promise<boolean> {
        if (this._associatedListView === null) {
            throw 'No ListView associated';
        }
        if (this._associatedListView.mode.get() !== ListViewMode.selecting) { 
            throw 'ListView not in selecting mode';
        }
        const amountSelected = this.amountSelected.get();
        if (amountSelected === 0) { 
            throw 'Nothing selected; WTF';
        }

        let message: string;
        let confirmText: string;
        if (amountSelected === 1) {
            message = "Skript löschen?";
            confirmText = "Skript löschen";
        } else {
            message = `${amountSelected} Skripte löschen?`;
            confirmText = "Skripte löschen";
        }

        const description = "Die Daten werden nur von diesem Smartphone gelöscht. Das Skript wird weiterhin auf dem PC mit dem es erstell wurde, vorhanden bleiben.";

        const result = await DialogManager.openDialog({
            heading: message,
            description,
            dialogButtons: [ {title: "Abrechen", dialogResult: "cancel"}, {title: confirmText, dialogResult: "delete"} ]
        });

        if (result === "delete") {
            this._associatedListView.removeSelected();
            return true;
        }
        return false;
    }

    private _listModeChanged(mode: ListViewMode) {
        this.mode.set(mode === ListViewMode.selecting ? "list" : "default")
    }

    private _listSelectedChanged() {
        if (this._associatedListView === null) {
            throw 'No ListView associated';
        }
        this.amountSelected.set(this._associatedListView.getSelected().length);
    }
}

const HeaderContext = createContext<HeaderController>();

export type HeaderElementProps = {
    showBackButton: boolean,
    title: string|null,
    onBack?: () => void,
    children: () => JSX.Element
};

function ListElement(
    props: {
        icon?: string,
        children: JSX.Element,
        static?: boolean
    }
): JSX.Element {
    return (
        <span class="list-element" classList={{ static: props.static }}>
            { 
                props.icon !== undefined 
                    ? <i class={`bi bi-${props.icon}`}/> 
                    : null
            }
            { props.children }
        </span>
    );
}

export function MenuElement(
    props: {
        closer?: () => void
    }
): JSX.Element {
    const authentication = useAuthentication()!;
    const closer = props.closer;

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

            { 
                Array.from({ length: 50 })
                    .map(v => <ListElement>{ String(v) }</ListElement>)
            }

            <div class="footer">
                <ListElement icon="person-circle" static>
                    <span style="flex:1">xxx@email.x</span>
                    <button class="secondary-button"
                        onClick={() => authentication.logout()}>
                        Logout
                    </button>
                </ListElement>
            </div>
        </nav>
    );
}

export function HeaderElement(props: HeaderElementProps) {
    const controller = new HeaderController();
    const authentication = useAuthentication()!;

    function openMenu() {
        DialogManager.openSideMenu(MenuElement);
    }

    return (
        <HeaderContext.Provider value={controller}>
            <div class="header-element">
            {   
                authentication.isLoggedIn()
                    ? <button onClick={openMenu}><i class="bi bi-list"/></button>
                    : null
            }
                <h1>Quipt</h1>
            </div>
        </HeaderContext.Provider>
    );
}

export function HeaderIconButton(props: { icon: string|Element, onClick?: () => void }) {
    const iconElement = typeof props.icon === "string" ? <i class={`bi bi-${props.icon}`}/> : props.icon;
    return (
        <button class="header-icon-button" onClick={props.onClick}>
            { iconElement } 
            <RippleEffect/>
        </button>
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
