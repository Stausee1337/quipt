import {
    type Keyed,
    ScriptEditorState,
    TransientState,
    type Key,
    SectionNode,
    ScriptNode,
} from './state';
import type { Script } from '../script';

export type RemoteContext = {};

export type StateAction<Input> = {
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

export function stateAction<Input>(action: StateAction<Input>): StateAction<Input> {
    return action;
}

export type HistoryEntry = {
    action: StateAction<any>;
    state: ScriptEditorState;
    changes: Set<Key<any>>;
};

declare const brand: unique symbol;
export type EditorEvent<T> = symbol & { [brand]: T };

function describeManagerEvent<T>(name: string): EditorEvent<T> {
    return Symbol(name) as EditorEvent<T>;
}

type DispatchStateActionEventParams<T> = {
    action: StateAction<T>;
    input: T;
    state: ScriptEditorState;
};

export const undoEvent = describeManagerEvent<Set<Key<any>>>('undo');
export const toggleContextHiddenEvent = describeManagerEvent<void>('toggleContextHidden');
export const scrollToNodeEvent = describeManagerEvent<Key<ScriptNode>>('scrollToNode');
export const setActiveSectionEvent = describeManagerEvent<Key<SectionNode>|undefined>('setActiveSection');
export const dispatchStateActionEvent =
    describeManagerEvent<DispatchStateActionEventParams<any>>('dispatchStateAction');

export type TeardownCallback = () => void;

export class ScriptEditorManager {
    history: HistoryEntry[] = [];
    state: ScriptEditorState;

    private _activeSection: Key<SectionNode> | null = null;
    private _contextHidden: boolean = false;

    private listeners = new Map<EditorEvent<any>, Set<(arg: any) => void>>();
    private subscribers = new Map<string, Set<() => void>>();
    private originAction: StateAction<any> | undefined;

    constructor(script: Script) {
        this.state = ScriptEditorState.build(script);
    }

    get activeSection(): Key<SectionNode> | null {
        return this._activeSection;
    }

    get contextHidden(): boolean {
        return this._contextHidden;
    }

    listen<T>(listener: (arg: T) => void, event: EditorEvent<T>): TeardownCallback;
    listen<T extends any[]>(
        listener: (arg: T[number]) => void,
        events: { [U in keyof T]: EditorEvent<T[U]> },
    ): TeardownCallback;
    listen(
        listener: (arg: any) => void,
        eventOrEvents: EditorEvent<any> | EditorEvent<any>[],
    ): TeardownCallback {
        const events: EditorEvent<any>[] =
            typeof eventOrEvents === 'symbol' ? [eventOrEvents] : eventOrEvents;
        for (let event of events) mapAdd(this.listeners, event, listener);
        return () => {
            for (let event of events) mapDelete(this.listeners, event, listener);
        };
    }

    subscribe<T extends Keyed<T[number]>[]>(
        listener: () => void,
        keys?: { readonly [K in keyof T]: Key<T[K]> },
    ): TeardownCallback {
        const keysArray = keys !== undefined ? Array.from(keys) : [''];
        for (let key of keysArray) mapAdd(this.subscribers, key, listener);
        return () => {
            for (let key of keysArray) mapDelete(this.subscribers, key, listener);
        };
    }

    private broadcast(event: EditorEvent<void>): void;
    private broadcast<T>(event: EditorEvent<T>, params: T): void;
    private broadcast(event: EditorEvent<any>, params?: any | undefined) {
        for (let listener of this.listeners.get(event) ?? []) listener(params);
    }

    private runChangeListeners(changes: Set<Key<any>>) {
        for (let listener of this.subscribers.get('') ?? []) listener();

        for (let key of changes.values())
            for (let listener of this.subscribers.get(key) ?? []) listener();
    }

    undo() {
        if (!this.history.length) return;
        const { state, changes } = this.history.pop()!;
        this.state = state;
        this.runChangeListeners(changes);
        this.broadcast(undoEvent, changes);
    }

    dispatchStateAction<Input>(action: StateAction<Input>, input: Input) {
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
        this.broadcast(dispatchStateActionEvent, { state, action, input });
    }

    scrollToNode(key: Key<ScriptNode>) {
        this.broadcast(scrollToNodeEvent, key);
    }

    toggleContextHidden() {
        this._contextHidden = !this._contextHidden;
        this.broadcast(toggleContextHiddenEvent);
    }

    setActiveSection(activeSection: Key<SectionNode> | null) {
        this._activeSection = activeSection;
        this.broadcast(setActiveSectionEvent, activeSection);
    }
}

function mapAdd<T, V>(map: Map<T, Set<V>>, key: T, value: V) {
    let set = map.get(key);
    if (set === undefined) {
        set = new Set<V>();
        map.set(key, set);
    }
    set.add(value);
}

function mapDelete<T, V>(map: Map<T, Set<V>>, key: T, value: V) {
    const set = map.get(key);
    set?.delete(value);
}
