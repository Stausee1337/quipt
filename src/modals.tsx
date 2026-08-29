import {
    Component,
    JSX,
    createContext,
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
    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && props.isOpen) props.onClose({ type: 'dismiss' });
    }

    onMount(() => {
        document.documentElement.addEventListener('keydown', onKeydown);
    });

    onCleanup(() => {
        document.documentElement.removeEventListener('keydown', onKeydown);
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
                <Portal mount={document.body}>
                    <div
                        class="fixed top-0 right-0 bottom-0 left-0 z-3000 bg-black/50 backdrop-blur-[1px]"
                        onClick={() => props.onClose({ type: 'dismiss' })}
                    />
                    <div class="bg-accent1 fixed top-2/5 left-1/2 z-3001 flex w-120 -translate-1/2 flex-col gap-2 rounded-2xl p-4">
                        <ModalContextObj.Provider value={{ accept: onAccept, dismiss: onDismiss }}>
                            {props.children}
                        </ModalContextObj.Provider>
                    </div>
                </Portal>
            )}
        </>
    );
}
