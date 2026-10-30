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

export type StateTransaction<Input> = {
    end(input: Input, state: TransientState, manager: ScriptEditorManager): void;
};

export function stateTransaction<Input>(transaction: StateTransaction<Input>): StateTransaction<Input> {
    return transaction;
}

export type StateAction<Input> = {
    apply(input: Input, state: TransientState, manager: ScriptEditorManager): void;
    transaction?: { start: StateTransaction<Input> } | { end: StateTransaction<Input> };
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

// At best: `Action`s track wether they begin/end a *trans*action as well
//  - `Action`s that end a transaction, are only valid if that transaction is active
//  - `Action`s that start a transaction, will first end current transaction of that kind
//  - different kinds of transactions can nest

export function stateAction<Input>(action: StateAction<Input>): StateAction<Input> {
    return action;
}

export type HistoryEntry = {
    action: StateAction<any>;
    state: ScriptEditorState;
    changes: Set<Key<any>>;
    startTransactionIndex?: number | undefined
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
export const setActiveSectionEvent = describeManagerEvent<Key<SectionNode> | undefined>(
    'setActiveSection',
);
export const dispatchStateActionEvent =
    describeManagerEvent<DispatchStateActionEventParams<any>>('dispatchStateAction');

export type TeardownCallback = () => void;

export type TransactionItem<T> = {
    input: any;
    transaction: StateTransaction<T>;
    historyIndex: number;
};

export class ScriptEditorManager {
    history: HistoryEntry[] = [];
    state: ScriptEditorState;

    transactionStack: TransactionItem<any>[] = []

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
        const { state, changes, startTransactionIndex } = this.history.pop()!;

        if (startTransactionIndex !== undefined)
            this.transactionStack.length = startTransactionIndex;

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
            const entry: HistoryEntry = {
                action,
                state: this.state,
                changes,
            };
            if (action.transaction && 'start' in action.transaction) {
                entry.startTransactionIndex = this.transactionStack.length;
                this.transactionStack.push({
                    input,
                    transaction: action.transaction.start,
                    historyIndex: this.history.length
                });
            }
            this.history.push(entry);
        }
        if (action.transaction && 'end' in action.transaction) {
            const transactionToEnd = action.transaction.end;
            const index = this.transactionStack.findIndex(item => item.transaction === transactionToEnd);
            if (index === -1)
                throw `invalid: ending transaction that hasn't been entered`;
            const item = this.transactionStack[index];
            this.transactionStack.length = index;
            this.history.length = item.historyIndex + 1;
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
