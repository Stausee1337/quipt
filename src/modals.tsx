import {
    JSX,
    createContext,
    useState,
    useContext,
    ReactNode,
    useEffect,
} from 'quipt/rexport';
import { createPortal } from 'react-dom';

type AcceptFn<T> = T extends void ? () => void : (result: T) => void;
type DismissFn = () => void;

type ModalContext<T> = {
    accept: AcceptFn<T>;
    dismiss: DismissFn;
};

const ModalContextObj = createContext<ModalContext<unknown>|undefined>(undefined);

export function useModalContext<T>(): ModalContext<T> | undefined {
    return useContext(ModalContextObj);
}

export type ModalResult<T> = { type: 'accept'; result: T } | { type: 'dismiss' };

export type ModalFn<T> = (element: ReactNode) => Promise<ModalResult<T>>;

export type CloseFn<T> = (result: ModalResult<T>) => void;

export type UseModalContext<T> = {
    currentContent: ReactNode|undefined;
    onClose: CloseFn<T>;
};

export type UseModalHook<T> = [UseModalContext<T>, ModalFn<T>];

export function useModal<T>(): UseModalHook<T> {
    const [currentContent, setCurrentContent] = useState<ReactNode>();
    const [currentCloseFn, setCurrentCloseFn] = useState<[CloseFn<T>]>();

    function onClose(result: ModalResult<T>) {
        if (currentCloseFn !== undefined) {
            setCurrentContent(undefined);
            setCurrentCloseFn(undefined);
            currentCloseFn[0](result);
        }
    }

    // <Modal isOpen={currentContent() !== undefined} onClose={onClose}>
    //     <Dynamic component={currentContent()?.[0]} />
    // </Modal>;

    return [
        { currentContent, onClose },
        element =>
            new Promise<ModalResult<T>>((resolve, reject) => {
                if (currentContent !== undefined) {
                    reject('cannot open a new modal while one is already open');
                    return;
                }
                setCurrentContent(element);
                setCurrentCloseFn([resolve]);
            })
    ]
}

export function Modal<T>({ context }: { context: UseModalContext<T> }): JSX.Element {
    const isOpen = context.currentContent !== undefined;
    function onKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && isOpen) context.onClose({ type: 'dismiss' });
    }

    useEffect(() => {
        document.documentElement.addEventListener('keydown', onKeydown);
        return () => {
            document.documentElement.removeEventListener('keydown', onKeydown);
        }
    }, [onKeydown])

    function onAccept(result: unknown) {
        context.onClose({ type: 'accept', result: result as T });
    }

    function onDismiss() {
        context.onClose({ type: 'dismiss' });
    }

    return (
        <>
            {isOpen && createPortal(
                <>
                    <div
                        className="fixed top-0 right-0 bottom-0 left-0 z-3000 bg-black/50 backdrop-blur-[1px]"
                        onClick={() => context.onClose({ type: 'dismiss' })}
                    />
                    <div className="bg-accent1 fixed top-2/5 left-1/2 z-3001 flex w-120 -translate-1/2 flex-col gap-2 rounded-2xl p-4">
                        <ModalContextObj.Provider value={{ accept: onAccept, dismiss: onDismiss }}>
                            {context.currentContent}
                        </ModalContextObj.Provider>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
