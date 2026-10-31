import {
    type Keyed,
    ScriptEditorState,
    TransientState,
    type Key,
    SectionNode,
} from './state';
import type { Script } from '../script';
import { useCallback, useSyncExternalStore } from 'react';

export type RemoteContext = {};

export type ScheduleActionCallback = {
    <T>(action: StateAction<T>, input: T): void;
};

export type StateTransaction<Input> = {
    commit(
        this: ScriptEditorManager,
        input: Input,
        state: TransientState,
        schedule: ScheduleActionCallback,
    ): boolean;
};

export function stateTransaction<Input>(
    transaction: StateTransaction<Input>,
): StateTransaction<Input> {
    return transaction;
}

export type StateAction<Input> = {
    apply(
        this: ScriptEditorManager,
        input: Input,
        state: TransientState,
        schedule: ScheduleActionCallback,
    ): void;
    transactionStart?: StateTransaction<Input>;
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
    state: ScriptEditorState;
    changes: Set<Key<any>>;
    transactionsStartIndex?: number | undefined;
};

export type TeardownCallback = () => void;

export type TransactionItem<T> = {
    input: any;
    transaction: StateTransaction<T>;
    historyIndex: number;
};

type ScheduledAction = {
    run(
        manager: ScriptEditorManager,
        state: TransientState,
        schedule: ScheduleActionCallback,
    ): boolean;
    input: any;
    transactionStart?: StateTransaction<any> | undefined
};

function scheduleStateAction<T>(action: StateAction<T>, input: T): ScheduledAction {
    return {
        run(manager, state, schedule) {
            action.apply.call(manager, this.input, state, schedule);
            return true;
        },
        input,
        transactionStart: action.transactionStart
    };
}

function scheduleTransaction<T>(item: TransactionItem<T>): ScheduledAction {
    return {
        run(manager, state, schedule) {
            return item.transaction.commit.call(manager, item.input, state, schedule);
        },
        input: item.input,
    };
}

type BoxedAction = {
    action: StateAction<any> | StateTransaction<any>,
    merge?(
        prevState: ScriptEditorState,
        currentState: ScriptEditorState,
        manager: ScriptEditorManager,
    ): boolean; 
    input: any;
};

function boxStateAction<T>(action: StateAction<T>, input: T): BoxedAction {
    return {
        action,
        merge: action.merge,
        input,
    };
}

function boxTransaction<T>(transaction: StateTransaction<T>, input: T): BoxedAction {
    return {
        action: transaction,
        input
    };
}

type Selector<State> = (state: State) => any;

abstract class BaseStore<State extends Record<string, any>, Selectors extends Record<string, Selector<State>>> {
    private listeners: Set<() => void> = new Set();

    constructor(protected _state: State, private selectors: Selectors) { }

    useState<K extends keyof State>(key: K): State[K];
    useState<K extends keyof Selectors>(key: K): ReturnType<Selectors[K]>;
    useState(key: string): any {
        const getSnapshot = useCallback(() => this.readState(key), [key]);
        return useSyncExternalStore(this.subscribe.bind(this), getSnapshot);
    }

    readState<K extends keyof State>(key: K): State[K];
    readState<K extends keyof Selectors>(key: K): ReturnType<Selectors[K]>;
    readState(key: string): any {
        if (key in this._state)
            return this._state[key];
        if (key in this.selectors)
            return this.selectors[key](this._state);
        throw `use invalid key '${key} on store'`;
    }

    subscribe(listener: () => void): TeardownCallback {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        }
    }

    update(newState: Partial<State>) {
        this._state = { ...this._state, ...newState };
        for (let listener of this.listeners)
            listener();
    }
}

export interface EditorViewState {
    history: HistoryEntry[];
    contextHidden: boolean;
    activeSection: Key<SectionNode> | null;
    viewState: ScriptEditorState;
}

function getActiveSection(state: EditorViewState): SectionNode | null {
    if (state.activeSection === null) return null;
    let activeSection: SectionNode;
    try {
        activeSection = state.viewState.lookup(state.activeSection);
    } catch {
        return null;
    }
    if (activeSection.parent === null) return activeSection;
    let activeSupersection: SectionNode;
    try {
        activeSupersection = state.viewState.lookup(activeSection.parent);
    } catch {
        return null;
    }
    return activeSupersection;
}

const scriptEditorSelectors = {
    hasHistory: (state) => state.history.length > 0,
    activeSectionNode: getActiveSection,
} satisfies Record<string, Selector<EditorViewState>>;

type ScriptEditorSelectors = typeof scriptEditorSelectors;

export class ScriptEditorManager extends BaseStore<EditorViewState, ScriptEditorSelectors> {

    transactionStack: TransactionItem<any>[] = [];

    private viewStateListeners = new Map<string, Set<() => void>>();
    private originAction: BoxedAction | undefined;

    constructor(script: Script) {
        super(
            {
                history: [],
                contextHidden: false,
                activeSection: null,
                viewState: ScriptEditorState.build(script),
            },
            scriptEditorSelectors
        );
    }

    get state(): ScriptEditorState {
        return this._state.viewState;
    }

    onStateChange(listener: () => void): TeardownCallback;
    onStateChange<T extends Keyed<T[number]>[]>(
        keys: { readonly [K in keyof T]: Key<T[K]> },
        listener: () => void,
    ): TeardownCallback
    onStateChange(
        keysOrListener: ArrayLike<Key<any>> | (() => void),
        listener?: () => void
    ): TeardownCallback {
        const keysArray = typeof keysOrListener === 'function' ? [''] : Array.from(keysOrListener);
        if (typeof keysOrListener === 'function')
            listener = keysOrListener;
        for (let key of keysArray) mapAdd(this.viewStateListeners, key, listener);
        return () => {
            for (let key of keysArray) mapDelete(this.viewStateListeners, key, listener);
        };
    }

    private runChangeListeners(changes: Set<Key<any>>) {
        for (let listener of this.viewStateListeners.get('') ?? []) listener();

        for (let key of changes.values())
            for (let listener of this.viewStateListeners.get(key) ?? []) listener();
    }

    undo() {
        if (this._state.history.length === 0) return;
        const { state, changes, transactionsStartIndex } = this._state.history.pop()!;

        if (transactionsStartIndex !== undefined)
            this.transactionStack.length = transactionsStartIndex;

        this.update({ viewState: state });
        this.runChangeListeners(changes);
    }

    dispatchStateAction<Input>(action: StateAction<Input>, input: Input) {
        if (action.transactionStart) {
            const index = this.transactionStack.findIndex(
                item => item.transaction === action.transactionStart,
            );
            if (index !== -1)
                // TODO: can do this with only one state.update()?
                this.endTransaction(index, /* commit= */ true);
        }

        const prevTransactionStackSize = this.transactionStack.length;
        const updateInfo = this.state.update(trans =>
            this.runScheduledActions(trans, [scheduleStateAction(action, input)]),
        );

        this.handleStateUpdate(
            updateInfo,
            boxStateAction(action, input),
            prevTransactionStackSize < this.transactionStack.length ? prevTransactionStackSize : undefined
        );
    }

    private handleStateUpdate(
        { state, changes }: { state: ScriptEditorState, changes: Set<Key<any>> },
        action: BoxedAction,
        prevTransactionStackSize?: number | undefined
    ) {
        if (!changes.size && !prevTransactionStackSize) return;
        const tos = this._state.history.at(-1);
        let history: HistoryEntry[];
        if (
            this.originAction?.action === action.action &&
            action.merge !== undefined &&
            action.merge(this.state, state, this) &&
            tos
        ) {
            const mergedChanges = tos.changes.union(changes);
            // replace
            
            // this._state.history[this._state.history.length - 1].changes = mergedChanges;
            history = this._state.history.toSpliced(
                this._state.history.length - 1,
                1,
                {
                    ...this._state.history.at(-1)!,
                    changes: mergedChanges
                }
            );
        } else {
            // push
            const entry: HistoryEntry = {
                state: this.state,
                changes,
                transactionsStartIndex: prevTransactionStackSize
            };
            history = [...this._state.history, entry];
        }
        this.update({ viewState: state, history });
        console.log(this._state.history);
        this.originAction = action;
        this.runChangeListeners(changes);

    }

    private runScheduledActions(
        state: TransientState,
        actionsThisCycle: ScheduledAction[],
    ): boolean {
        const actionsNextCycle: ScheduledAction[] = [];
        const schedule: ScheduleActionCallback = (action, input) => actionsNextCycle.push(scheduleStateAction(action, input));

        let proceed = true;
        for (let scheduledAction of actionsThisCycle) {
            proceed &&= scheduledAction.run(this, state, schedule);
            if (!proceed)
                break;
            if (scheduledAction.transactionStart)
                this.transactionStack.push({
                    input: scheduledAction.input,
                    transaction: scheduledAction.transactionStart,
                    historyIndex: this._state.history.length,
                });
        }

        if (actionsNextCycle.length > 0)
            return this.runScheduledActions(state, actionsNextCycle);
        return proceed;
    }

    commitTransaction(transaction: StateTransaction<any>) {
        const index = this.transactionStack.findIndex(
            item => item.transaction === transaction,
        );
        if (index === -1) throw `invalid: ending transaction that hasn't been entered`;
        this.endTransaction(index, /* commit= */ true);
    }

    dismissTransaction(transaction: StateTransaction<any>) {
        const index = this.transactionStack.findIndex(
            item => item.transaction === transaction,
        );
        if (index === -1) throw `invalid: ending transaction that hasn't been entered`;
        this.endTransaction(index, /* commit= */ false);
    }
    
    private endTransaction(index: number, commit: boolean) { 
        const item = this.transactionStack[index];
        const scheduledActions = this.transactionStack
            .slice(index)
            .toReversed()
            .map(scheduleTransaction);
        const { result: didCommit, ...updateInfo } = this.state.update(trans => commit && this.runScheduledActions(trans, scheduledActions));
        this.handleStateUpdate(updateInfo, boxTransaction(item.transaction, item.input));

        if (this._state.history.length > item.historyIndex + 1)
            this._state.history.length = item.historyIndex + 1;
        this.transactionStack.length = index;
        
        console.log('didCommit', didCommit);
        if (!didCommit)
            this.undo();
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
