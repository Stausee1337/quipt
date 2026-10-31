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

export class ScriptEditorManager {
    history: HistoryEntry[] = [];
    state: ScriptEditorState;

    transactionStack: TransactionItem<any>[] = [];

    private _activeSection: Key<SectionNode> | null = null;
    private _contextHidden: boolean = false;

    private listeners = new Map<EditorEvent<any>, Set<(arg: any) => void>>();
    private subscribers = new Map<string, Set<() => void>>();
    private originAction: BoxedAction | undefined;

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
        const { state, changes, transactionsStartIndex: startTransactionIndex } = this.history.pop()!;

        if (startTransactionIndex !== undefined)
            this.transactionStack.length = startTransactionIndex;

        this.state = state;
        this.runChangeListeners(changes);
        this.broadcast(undoEvent, changes);
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
        if (!changes.size) return;
        const tos = this.history.at(-1);
        if (
            this.originAction?.action === action.action &&
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
                state: this.state,
                changes,
                transactionsStartIndex: prevTransactionStackSize
            };
            this.history.push(entry);
        }
        this.state = state;
        this.originAction = action;
        this.runChangeListeners(changes);
        this.broadcast(dispatchStateActionEvent, { state, action: action.action, input: action.input });

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
                    historyIndex: this.history.length,
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
        this.history.length = item.historyIndex + 1;
        this.transactionStack.length = index;
        
        console.log('didCommit', didCommit);
        if (!didCommit)
            this.undo();
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
