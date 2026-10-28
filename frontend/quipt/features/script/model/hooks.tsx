import {
    type JSX,
    type ReactNode,
    createContext,
    useContext,
    useRef,
    useSyncExternalStore,
    useEffect,
} from 'react';
import type { EditorEvent, ScriptEditorManager } from './manager';
import type { Key, Keyed, ScriptEditorState } from './state';

export function useScriptEditorManager(): ScriptEditorManager {
    return useContext(ScriptEditorContextObject).manager!;
}

export function useScriptEditorManagerListener<T>(
    listener: (arg: T) => void,
    event: EditorEvent<T>,
): void;
export function useScriptEditorManagerListener<T extends any[]>(
    listener: (arg: T[number]) => void,
    events: { [U in keyof T]: EditorEvent<T[U]> },
): void;
export function useScriptEditorManagerListener(
    listener: (arg: any) => void,
    eventOrEvents: EditorEvent<any> | EditorEvent<any>[],
): void {
    const manager = useScriptEditorManager();
    // FIXME: listener is actually changing every time in here. Maybe fix
    useEffect(() => manager.listen(listener, eventOrEvents as any), [listener, eventOrEvents]);
}

export function useScrollContainer(): HTMLElement | null {
    return useContext(ScriptEditorContextObject).scrollContainer;
}

export function useScriptEditorStateAccessor<T>(
    accessor: (state: ScriptEditorState) => T,
    // valuesAreEqual?: (prev: T, next: T) => boolean
): T {
    const manager = useScriptEditorManager();
    return useSyncExternalStore(
        listener => manager.subscribe(listener),
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
    const cache = useRef<{
        state: ScriptEditorState;
        keys: readonly Key<T>[];
        result: Readonly<T>[];
    }>(null);
    return useSyncExternalStore(
        listener =>
            manager.subscribe(listener, typeof keyOrKeys === 'string' ? [keyOrKeys] : keyOrKeys),
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
                cache.current === null ||
                cache.current.state !== manager.state ||
                cache.current.keys !== keyOrKeys
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
