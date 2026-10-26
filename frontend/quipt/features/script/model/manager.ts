import { type Keyed, ScriptEditorState, TransientState, type Key } from './state';
import type { Script } from '../script';

export type RemoteContext = {};

export type Action<Input> = {
    apply(input: Input, state: TransientState, manager: ScriptEditorManager): void;
    remote?: {
        forward: (context: RemoteContext, input: Input) => Promise<void>;
        backward: (context: RemoteContext, input: Input) => Promise<void>;
    };
    merge?(
        prevState: ScriptEditorState,
        currentState: ScriptEditorState,
        manager: ScriptEditorManager,
    ): boolean;
};

export function makeAction<Input>(action: Action<Input>): Action<Input> {
    return action;
}

export type HistoryEntry = {
    action: Action<any>;
    state: ScriptEditorState;
    changes: Set<Key<any>>;
};

export class ScriptEditorManager {
    history: HistoryEntry[] = [];
    state: ScriptEditorState;

    private listeners = new Map<string, Set<() => void>>();
    private originAction: Action<any> | undefined;

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

    undo() {
        if (!this.history.length) return;
        const { state, changes } = this.history.pop()!;
        this.state = state;
        this.runChangeListeners(changes);
    }

    dispatch<Input>(action: Action<Input>, input: Input) {
        const [state, changes] = this.state.update(trans => action.apply(input, trans, this));
        if (!changes.size) return;
        const tos = this.history.at(-1);
        if (
            this.originAction === action &&
            action.merge !== undefined &&
            action.merge(this.state, state, this) &&
            tos
        ) {
            const mergedChanges = tos.changes.union(changes);
            // replace
            this.history[this.history.length - 1].changes = mergedChanges;
        } else {
            // push
            this.history.push({
                action,
                state: this.state,
                changes,
            });
        }
        this.state = state;
        this.originAction = action;
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
