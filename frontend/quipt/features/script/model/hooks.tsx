import {
    type JSX,
    type ReactNode,
    createContext,
    useContext,
    useRef,
    useSyncExternalStore,
} from 'react';
import type { ScriptEditorManager } from './manager';
import type { Key, Keyed, ScriptEditorState } from './state';

export function useScriptEditorManager(): ScriptEditorManager {
    return useContext(ScriptEditorContextObject).manager!;
}

export function useScrollContainer(): HTMLElement | null {
    return useContext(ScriptEditorContextObject).scrollContainer;
}

export function useScriptEditorStateAccessor<T>(accessor: (state: ScriptEditorState) => T): T {
    const manager = useScriptEditorManager();
    return useSyncExternalStore(
        listener => manager.onStateChange(listener),
        () => accessor(manager.state),
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
    const manager = useScriptEditorManager();
    const cacheRef = useRef<{
        state: ScriptEditorState;
        keys: readonly Key<T>[];
        result: Readonly<T>[];
    }>(null);

    return useSyncExternalStore(
        listener =>
            manager.onStateChange(
                typeof keyOrKeys === 'string' ? [keyOrKeys] : keyOrKeys,
                listener,
            ),
        () => {
            if (typeof keyOrKeys === 'string')
                try {
                    return manager.state.lookup(keyOrKeys);
                } catch (e) {
                    if (onLookupError) {
                        onLookupError(e);
                        return null;
                    }
                    throw e;
                }

            if (
                cacheRef.current === null ||
                cacheRef.current.state !== manager.state ||
                cacheRef.current.keys !== keyOrKeys
            ) {
                let result;
                try {
                    result = keyOrKeys.map(key => manager.state.lookup(key));
                } catch (e) {
                    if (onLookupError) {
                        onLookupError(e);
                        return null;
                    }
                    throw e;
                }
                cacheRef.current = {
                    state: manager.state,
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
    manager: ScriptEditorManager | null;
    scrollContainer: HTMLElement | null;
};

const ScriptEditorContextObject = createContext<ScriptEditorContext>({
    manager: null,
    scrollContainer: null,
});

export function ScriptEditorContextProivder({
    children,
    manager,
    scrollContainer,
}: {
    children: ReactNode;
    manager: ScriptEditorManager;
    scrollContainer: HTMLElement | null;
}): JSX.Element {
    return (
        <ScriptEditorContextObject.Provider
            value={{ manager, scrollContainer }}
            children={children}
        />
    );
}
