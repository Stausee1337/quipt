import {
    Component,
    JSX,
    createContext,
    createEffect,
    createSignal,
    onCleanup,
    onMount,
    useContext,
} from 'solid-js';
import { Dynamic, Portal } from 'solid-js/web';

type AcceptFn<T> = T extends void ? () => void : (result: T) => void;
type DismissFn = () => void;

type ModalContext<T> = {
    accept: AcceptFn<T>;
    dismiss: DismissFn;
};

const ModalContextObj = createContext<ModalContext<unknown>>();

export function useModalContext<T>(): ModalContext<T> | undefined {
    return useContext(ModalContextObj);
}

type ModalResult<T> = { type: 'accept'; result: T } | { type: 'dismiss' };

type ModalFn<T> = (component: Component) => Promise<ModalResult<T>>;

type CloseFn<T> = (result: ModalResult<T>) => void;

export function useModal<T>(): ModalFn<T> {
    const [currentContent, setCurrentContent] = createSignal<[Component]>();
    const [currentCloseFn, setCurrentCloseFn] = createSignal<[CloseFn<T>]>();

    function onClose(result: ModalResult<T>) {
        const closeFn = currentCloseFn();
        if (closeFn !== undefined) {
            setCurrentContent(undefined);
            setCurrentCloseFn(undefined);
            closeFn[0](result);
        }
    }

    <Modal isOpen={currentContent() !== undefined} onClose={onClose}>
        <Dynamic component={currentContent()?.[0]} />
    </Modal>;

    return component =>
        new Promise<ModalResult<T>>((resolve, reject) => {
            if (currentContent() !== undefined) {
                reject('cannot open a new modal while one is already open');
                return;
            }
            setCurrentContent([component]);
            setCurrentCloseFn([resolve]);
        });
}

export function Modal<T>(props: {
    isOpen: boolean;
    onClose: CloseFn<T>;
    children: JSX.Element;
}): JSX.Element {
    const [modalRoot, setModalRoot] = createSignal<HTMLDivElement>();

    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') props.onClose({ type: 'dismiss' });
    }

    onMount(() => {
        document.documentElement.addEventListener('keydown', onKeydown);
    });

    onCleanup(() => {
        document.documentElement.removeEventListener('keydown', onKeydown);
    });

    createEffect(() => {
        const root = modalRoot();
        if (root !== undefined && root.isConnected) root.id = 'dialog-root';
    });

    function onAccept(result: unknown) {
        props.onClose({ type: 'accept', result: result as T });
    }

    function onDismiss() {
        props.onClose({ type: 'dismiss' });
    }

    return (
        <>
            {props.isOpen && (
                <Portal ref={setModalRoot} mount={document.body}>
                    <div
                        id="modal-dialog-backdrop"
                        onClick={() => props.onClose({ type: 'dismiss' })}
                    />
                    <div id="dialog-box">
                        <ModalContextObj.Provider value={{ accept: onAccept, dismiss: onDismiss }}>
                            {props.children}
                        </ModalContextObj.Provider>
                    </div>
                </Portal>
            )}
        </>
    );
}
