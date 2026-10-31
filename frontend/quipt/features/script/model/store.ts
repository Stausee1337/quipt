import {
    type Keyed,
    ScriptEditorState,
    TransientState,
    type Key,
    SectionNode,
    ScriptNode,
    ActionNode,
    DialogueNode,
} from './state';
import type { Script } from '../script';
import { useCallback, useRef, useSyncExternalStore } from 'react';

export type RemoteContext = {};

export type ScheduleActionCallback = {
    <T>(action: StateAction<T>, input: T): void;
};

export type StateAction<Input> = {
    apply(
        this: ScriptEditorStore,
        input: Input,
        state: TransientState,
        schedule: ScheduleActionCallback,
    ): void;
    remote?: {
        forward: (context: RemoteContext, input: Input) => Promise<void>;
        backward: (context: RemoteContext, input: Input) => Promise<void>;
    };
    merge?(
        prevState: ScriptEditorState,
        currentState: ScriptEditorState,
        store: ScriptEditorStore,
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
};

export type TeardownCallback = () => void;

type ScheduledAction = (
    store: ScriptEditorStore,
    state: TransientState,
    schedule: ScheduleActionCallback,
) => void;

type Selector<State> = (state: State, ...args: any[]) => any;

type Tail<T extends readonly any[]> = T extends readonly [any, ...infer Rest] ? Rest : [];

type SelectorArgs<Selector> = Selector extends (...params: infer Params) => any
    ? Tail<Params>
    : never;

abstract class BaseStore<
    State extends Record<string, any>,
    Selectors extends Record<string, Selector<State>>,
> {
    private listeners: Set<() => void> = new Set();

    constructor(
        protected state: State,
        private selectors: Selectors,
    ) {}

    useState<K extends keyof State>(key: K): State[K];
    useState<K extends keyof Selectors>(
        key: K,
        ...args: SelectorArgs<Selectors[K]>
    ): ReturnType<Selectors[K]>;
    useState(key: string, ...args: any[]): any {
        const cacheRef = useRef<{
            state: State;
            key: string;
            result: any;
        }>(null);
        const getSnapshot = useCallback(() => {
            if (
                cacheRef.current === null ||
                cacheRef.current.state !== this.state ||
                cacheRef.current.key !== key
            ) {
                let result = this.readState(key, ...args as any);
                cacheRef.current = {
                    state: this.state,
                    key,
                    result,
                };
                return result;
            }
            return cacheRef.current.result;
        }, [key, ...args]);
        return useSyncExternalStore(this.subscribe.bind(this), getSnapshot);
    }

    readState<K extends keyof State>(key: K): State[K];
    readState<K extends keyof Selectors>(
        key: K,
        ...args: SelectorArgs<Selectors[K]>
    ): ReturnType<Selectors[K]>;
    readState(key: string, ...args: any[]): any {
        if (key in this.state) return this.state[key];
        if (key in this.selectors) return this.selectors[key](this.state);
        throw `use invalid key '${key} on store'`;
    }

    subscribe(listener: () => void): TeardownCallback {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    update(newState: Partial<State>) {
        const hasChanged = Object.entries(newState).some(
            ([key, value]) => this.state[key] !== value,
        );
        if (!hasChanged) return;
        this.state = { ...this.state, ...newState };
        for (let listener of this.listeners) listener();
    }
}

export interface EditorViewState {
    history: HistoryEntry[];
    contextHidden: boolean;
    activeSection: Key<SectionNode> | null;
    editorState: ScriptEditorState; // FIXME: This is NOT the view state!
}

function getActiveSection(state: EditorViewState): SectionNode | null {
    if (state.activeSection === null) return null;
    let activeSection: SectionNode;
    try {
        activeSection = state.editorState.lookup(state.activeSection);
    } catch {
        return null;
    }
    if (activeSection.parent === null) return activeSection;
    let activeSupersection: SectionNode;
    try {
        activeSupersection = state.editorState.lookup(activeSection.parent);
    } catch {
        return null;
    }
    return activeSupersection;
}

export type FlatContentItem = {
    key: Key<ScriptNode>;
    estimatedHeight: number;
};

function nodeIsContextual(node: ScriptNode, state: ScriptEditorState): boolean {
    if (
        node instanceof DialogueNode &&
        (node.markedAsContext || node.actors.includes(state.selfActor!))
    ) {
        return true;
    } else if (node instanceof ActionNode && node.markedAsContext) {
        return true;
    }
    return false;
}

export function processMapScriptItems(
    scriptItems: (Key<ActionNode> | Key<DialogueNode>)[],
    state: ScriptEditorState,
    hideContext: boolean,
): FlatContentItem[] {
    const result: FlatContentItem[] = [];

    for (let idx = 0; idx < scriptItems.length; idx++) {
        const key = scriptItems[idx];
        if (!hideContext || state.selfActor === null) {
            result.push({ key, estimatedHeight: 48 });
        } else {
            const node = state.lookup(key);
            if (nodeIsContextual(node, state)) {
                result.push({ key, estimatedHeight: 48 });
            } else {
                let isFollowingNodeContextual = false;
                for (let idx2 = idx + 1; idx2 < scriptItems.length; idx2++) {
                    const key = scriptItems[idx2];
                    const node = state.lookup(key);

                    if (nodeIsContextual(node, state)) {
                        isFollowingNodeContextual = true;
                        break;
                    }
                    if (!(node instanceof ActionNode)) break;
                }

                if (isFollowingNodeContextual) result.push({ key, estimatedHeight: 48 });
            }
        }
    }

    return result;
}

function toFlatContent(state: EditorViewState): FlatContentItem[] {
    const { editorState: viewState, contextHidden } = state;
    const structure = viewState.structure;
    switch (structure.depth) {
        case 0:
            return processMapScriptItems(structure.children, viewState, contextHidden);
        case 1:
            return structure.children.flatMap(sectionPack => {
                const items = processMapScriptItems(sectionPack.children, viewState, contextHidden);
                return items.length > 0
                    ? [{ key: sectionPack.key, estimatedHeight: 150 }, ...items]
                    : [];
            });
        case 2:
            return structure.children.flatMap(supersectionPack => {
                const items = supersectionPack.children.flatMap(sectionPack => {
                    const items = processMapScriptItems(
                        sectionPack.children,
                        viewState,
                        contextHidden,
                    );
                    return items.length > 0
                        ? [{ key: sectionPack.key, estimatedHeight: 16 }, ...items]
                        : [];
                });
                return items.length > 0
                    ? [{ key: supersectionPack.key, estimatedHeight: 150 }, ...items]
                    : [];
            });
    }
}

const scriptEditorSelectors = {
    hasHistory: state => state.history.length > 0,
    activeSectionNode: getActiveSection,
    flatContent: toFlatContent,
} satisfies Record<string, Selector<EditorViewState>>;

type ScriptEditorSelectors = typeof scriptEditorSelectors;

export class ScriptEditorStore extends BaseStore<EditorViewState, ScriptEditorSelectors> {
    private viewStateListeners = new Map<string, Set<() => void>>();
    private originAction: StateAction<any> | undefined;

    constructor(script: Script) {
        super(
            {
                history: [],
                contextHidden: false,
                activeSection: null,
                editorState: ScriptEditorState.build(script),
            },
            scriptEditorSelectors,
        );
    }

    get editorState(): ScriptEditorState {
        return this.state.editorState;
    }

    onStateChange(listener: () => void): TeardownCallback;
    onStateChange<T extends Keyed<T[number]>[]>(
        keys: { readonly [K in keyof T]: Key<T[K]> },
        listener: () => void,
    ): TeardownCallback;
    onStateChange(
        keysOrListener: ArrayLike<Key<any>> | (() => void),
        listener?: () => void,
    ): TeardownCallback {
        const keysArray = typeof keysOrListener === 'function' ? [''] : Array.from(keysOrListener);
        if (typeof keysOrListener === 'function') listener = keysOrListener;
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
        if (this.state.history.length === 0) return;
        const { state, changes } = this.state.history.pop()!;
        this.update({ editorState: state });
        this.runChangeListeners(changes);
    }

    dispatchStateAction<Input>(action: StateAction<Input>, input: Input) {
        const { changes, state } = this.editorState.update(trans =>
            this.runScheduledActions(trans, [scheduleStateAction(action, input)]),
        );

        if (!changes.size) return;
        const tos = this.state.history.at(-1);
        let history: HistoryEntry[];
        if (
            this.originAction === action &&
            action.merge !== undefined &&
            action.merge(this.editorState, state, this) &&
            tos
        ) {
            const mergedChanges = tos.changes.union(changes);
            // replace
            history = this.state.history.toSpliced(this.state.history.length - 1, 1, {
                ...this.state.history.at(-1)!,
                changes: mergedChanges,
            });
        } else {
            // push
            const entry: HistoryEntry = {
                state: this.editorState,
                changes,
            };
            history = [...this.state.history, entry];
        }
        this.update({ editorState: state, history });
        this.originAction = action;
        this.runChangeListeners(changes);
    }

    private runScheduledActions(state: TransientState, actionsThisCycle: ScheduledAction[]) {
        const actionsNextCycle: ScheduledAction[] = [];
        const schedule: ScheduleActionCallback = (action, input) =>
            actionsNextCycle.push(scheduleStateAction(action, input));

        for (let scheduledAction of actionsThisCycle) scheduledAction(this, state, schedule);

        if (actionsNextCycle.length > 0) this.runScheduledActions(state, actionsNextCycle);
    }
}

function scheduleStateAction<T>(action: StateAction<T>, input: T): ScheduledAction {
    return (store, state, schedule) => action.apply.call(store, input, state, schedule);
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
