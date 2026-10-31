import {
    type JSX,
    type ReactNode,
    createContext,
    useContext,
    useRef,
    useSyncExternalStore,
} from 'react';
import type { ScriptEditorStore } from './store';
import type { Key, Keyed, ScriptEditorState } from './state';

export function useScriptEditorStore(): ScriptEditorStore {
    return useContext(ScriptEditorContextObject).store!;
}

export function useScrollContainer(): HTMLElement | null {
    return useContext(ScriptEditorContextObject).scrollContainer;
}

export function useScriptEditorStateAccessor<T>(accessor: (state: ScriptEditorState) => T): T {
    const store = useScriptEditorStore();
    return useSyncExternalStore(
        listener => store.onStateChange(listener),
        () => accessor(store.editorState),
    );
}

export function useKeyedState<T extends Keyed<T>>(key: Key<T>): Readonly<T>;
export function useKeyedState<T extends Keyed<T>>(key: readonly Key<T>[]): Readonly<T>[];
export function useKeyedState<T extends Keyed<T>>(
    key: Key<T>,
    onLookupError: (error: unknown) => void,
): Readonly<T> | null;
export function useKeyedState<T extends Keyed<T>>(
    key: readonly Key<T>[],
    onLookupError: (error: unknown) => void,
): Readonly<T>[] | null;
export function useKeyedState<T extends Keyed<T>>(
    keyOrKeys: Key<T> | readonly Key<T>[],
    onLookupError?: (error: unknown) => void,
): Readonly<T>[] | Readonly<T> | null {
    const store = useScriptEditorStore();
    const cacheRef = useRef<{
        state: ScriptEditorState;
        keys: readonly Key<T>[];
        result: Readonly<T>[];
    }>(null);

    return useSyncExternalStore(
        listener =>
            store.onStateChange(
                typeof keyOrKeys === 'string' ? [keyOrKeys] : keyOrKeys,
                listener,
            ),
        () => {
            if (typeof keyOrKeys === 'string')
                try {
                    return store.editorState.lookup(keyOrKeys);
                } catch (e) {
                    if (onLookupError) {
                        onLookupError(e);
                        return null;
                    }
                    throw e;
                }

            if (
                cacheRef.current === null ||
                cacheRef.current.state !== store.editorState ||
                cacheRef.current.keys !== keyOrKeys
            ) {
                let result;
                try {
                    result = keyOrKeys.map(key => store.editorState.lookup(key));
                } catch (e) {
                    if (onLookupError) {
                        onLookupError(e);
                        return null;
                    }
                    throw e;
                }
                cacheRef.current = {
                    state: store.editorState,
                    keys: keyOrKeys,
                    result,
                };
                return result;
            }
            return cacheRef.current.result;
        },
    );
}

type ScriptEditorContext = {
    store: ScriptEditorStore | null;
    scrollContainer: HTMLElement | null;
};

const ScriptEditorContextObject = createContext<ScriptEditorContext>({
    store: null,
    scrollContainer: null,
});

export function ScriptEditorContextProivder({
    children,
    store,
    scrollContainer,
}: {
    children: ReactNode;
    store: ScriptEditorStore;
    scrollContainer: HTMLElement | null;
}): JSX.Element {
    return (
        <ScriptEditorContextObject.Provider
            value={{ store, scrollContainer }}
            children={children}
        />
    );
}
