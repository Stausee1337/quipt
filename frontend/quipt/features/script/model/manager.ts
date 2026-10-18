import { type Keyed, ScriptEditorState, TransientState, type Key, runUpdate } from './state';
import type { Script } from '../script';

export type Action = (state: TransientState, manager: ScriptEditorManager) => void;

export class ScriptEditorManager {
    state: ScriptEditorState;
    scrollContainer: HTMLElement | null = null;

    private listeners = new Map<string, Set<() => void>>();

    constructor(script: Script) {
        this.state = ScriptEditorState.build(script);
    }

    subscribe<T extends Keyed<T[number]>[]>(
        listener: () => void,
        keys?: { readonly [K in keyof T]: Key<T[K]> },
    ): () => void {
        const keysArray = keys !== undefined ? Array.from(keys) : [''];
        for (let key of keysArray) mapAdd(this.listeners, key, listener);
        return () => {
            for (let key of keysArray) mapDelete(this.listeners, key, listener);
        };
    }

    dispatch(action: Action) {
        const [state, changes] = runUpdate(this.state, trans => action(trans, this));
        this.state = state;
        this.runChangeListeners(changes);
    }

    private runChangeListeners(changes: Set<Key<any>>) {
        for (let listener of this.listeners.get('') ?? []) listener();

        for (let key of changes.values())
            for (let listener of this.listeners.get(key) ?? []) listener();
    }
}

function mapAdd(map: Map<string, Set<() => void>>, key: string, listener: () => void) {
    let set = map.get(key);
    if (set === undefined) {
        set = new Set<() => void>();
        map.set(key, set);
    }
    set.add(listener);
}

function mapDelete(map: Map<string, Set<() => void>>, key: string, listener: () => void) {
    const set = map.get(key);
    set?.delete(listener);
}
