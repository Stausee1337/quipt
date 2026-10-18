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

const ScriptEditorManagerContextObject = createContext<ScriptEditorManager | null>(null);

export function useScriptEditorManager(): ScriptEditorManager {
    return useContext(ScriptEditorManagerContextObject)!;
}

export function useScriptEditorState(): ScriptEditorState {
    const manager = useContext(ScriptEditorManagerContextObject)!;
    return useSyncExternalStore(
        listener => manager.subscribe(listener),
        () => manager.state,
    );
}

export function useScriptEditorStateAccessor<T>(
    accessor: (state: ScriptEditorState) => T,
    // valuesAreEqual?: (prev: T, next: T) => boolean
): T {
    const manager = useContext(ScriptEditorManagerContextObject)!;
    return useSyncExternalStore(
        listener => manager.subscribe(listener),
        () => accessor(manager.state),
    );
}

export function useKeyedState<T extends Keyed<T>>(key: Key<T>): Readonly<T>;
export function useKeyedState<T extends Keyed<T>>(key: readonly Key<T>[]): Readonly<T>[];
export function useKeyedState<T extends Keyed<T>>(
    keyOrKeys: Key<T> | readonly Key<T>[],
): Readonly<T>[] | Readonly<T> {
    const manager = useContext(ScriptEditorManagerContextObject)!;
    const cache = useRef<{
        state: ScriptEditorState;
        keys: readonly Key<T>[];
        result: Readonly<T>[];
    }>(null);
    return useSyncExternalStore(
        listener =>
            manager.subscribe(listener, typeof keyOrKeys === 'string' ? [keyOrKeys] : keyOrKeys),
        () => {
            if (typeof keyOrKeys === 'string') return manager.state.lookup(keyOrKeys);
            if (
                cache.current === null ||
                cache.current.state !== manager.state ||
                cache.current.keys !== keyOrKeys
            ) {
                const result = keyOrKeys.map(key => manager.state.lookup(key));
                cache.current = {
                    state: manager.state,
                    keys: keyOrKeys,
                    result,
                };
                return result;
            }
            return cache.current.result;
        },
    );
}

export function ScriptEditorManagerProivder({
    children,
    value,
}: {
    children: ReactNode;
    value: ScriptEditorManager;
}): JSX.Element {
    return <ScriptEditorManagerContextObject.Provider value={value} children={children} />;
}
