import {
    type ComponentProps,
    type JSX,
    type ReactNode,
    type RefObject,
    cloneElement,
    createContext,
    memo,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';

import { Button as BaseButton } from '@base-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import classnames from 'classnames';

import { Button } from 'quipt/components/button';
import { Icon } from 'quipt/components/icon';
import { SearchInput } from 'quipt/components/input';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';
import { useBreakpoints } from 'quipt/responsive';
import { type Color } from 'quipt/color-palette';
import { type Script } from '../script';
import { renderContentNode } from './section';
import { HLine, VLine, ContentInfoView } from './common';
import {
    type ActorKey,
    type EditableSectionNode,
    type Key,
    type Keyed,
    type ScriptNode,
    ScriptEditorState,
    type Structure,
    TransientState,
    runUpdate,
} from '../state';

function ScriptViewHeader({ name }: { name: string }): JSX.Element {
    return (
        <header className="flex flex-col gap-y-2 px-9 py-2">
            <div className="flex items-center">
                <h1 className="text-heading-1">{name}</h1>
                <BaseButton className="ms-auto cursor-pointer" aria-label="Optionen">
                    <Icon iconName="three-dots-vertical" className="text-accent-100 h-7.5 w-7.5" />
                </BaseButton>
            </div>
            <HLine />
        </header>
    );
}

function MobileScriptViewHeader({ name }: { name: string }): JSX.Element {
    return (
        <div className="flex flex-col items-start gap-y-2 px-3 pt-2">
            <BaseButton className="bg-accent-10 rounded-full p-2">
                <Icon iconName="chevron-left" className="icon-lg" />
            </BaseButton>
            <h1 className="text-heading-1">{name}</h1>
        </div>
    );
}

function ScriptContentViewHeader(): JSX.Element {
    const breakpoints = useBreakpoints();
    return (
        <header className="mx-3 flex sm:mx-9 sm:my-1">
            {breakpoints.sm ? (
                <SearchInput placeholder="Skript durchsuchen" />
            ) : (
                <Button
                    variant="secondary"
                    className="flex items-center gap-x-2"
                    aria-label="Suchen">
                    <Icon iconName="search" /> Suchen
                </Button>
            )}
            <div className="ms-auto flex gap-x-2">
                <Tooltip label="Rückgängig">
                    <IconButton iconName="arrow-counterclockwise" render={<Tooltip.Trigger />} />
                </Tooltip>
                <Tooltip label="Kontext ausblenden">
                    <IconButton iconName="eye-slash" render={<Tooltip.Trigger />} />
                </Tooltip>
                <Tooltip label="Übersicht">
                    <IconButton iconName="list-nested" render={<Tooltip.Trigger />} />
                </Tooltip>
            </div>
        </header>
    );
}

type FlatContentItem = {
    key: Key<ScriptNode>;
    estimatedHeight: number;
};

function toFlatContent(structure: Readonly<Structure>): FlatContentItem[] {
    switch (structure.depth) {
        case 0:
            return structure.children.map(key => ({ key, estimatedHeight: 48 }));
        case 1:
            return structure.children.flatMap(sectionPack => [
                { key: sectionPack.key, estimatedHeight: 150 },
                ...sectionPack.children.map(key => ({ key, estimatedHeight: 48 })),
            ]);
        case 2:
            return structure.children.flatMap(supersectionPack => [
                { key: supersectionPack.key, estimatedHeight: 150 },
                ...supersectionPack.children.flatMap(sectionPack => [
                    { key: sectionPack.key, estimatedHeight: 16 },
                    ...sectionPack.children.map(key => ({ key, estimatedHeight: 48 })),
                ]),
            ]);
    }
}

const VirtualizedContentList = memo(
    function VirtualizedContentList({ gap, content }: { gap: number; content: FlatContentItem[] }) {
        const containerRef = useRef<HTMLDivElement | null>(null);
        const manager = useScriptEditorManager();

        const [enabled, setEnabled] = useState(false);
        const [scrollMargin, setScrollMargin] = useState(0);

        const virtual = useVirtualizer({
            count: content.length,
            getScrollElement: () => manager.scrollContainer,
            estimateSize: idx => content[idx].estimatedHeight,
            getItemKey: idx => content[idx].key,
            gap,
            enabled,
            scrollMargin,
            directDomUpdates: true,
            laneAssignmentMode: 'measured',
        });

        useEffect(() => {
            setEnabled(manager.scrollContainer !== null);
        }, [manager.scrollContainer]);

        useEffect(() => {
            if (containerRef.current !== null) {
                const rect = containerRef.current.getBoundingClientRect();
                setScrollMargin(rect.top);
            } else {
                setScrollMargin(0);
            }
        }, [containerRef.current]);

        function onContainerRefUpdate(element: HTMLDivElement | null) {
            virtual.containerRef(element);
            containerRef.current = element;
        }

        return (
            <div className="relative" ref={onContainerRefUpdate}>
                {virtual.getVirtualItems().map(item => {
                    const node = renderContentNode(content[item.index].key);
                    if (node === null) return null;
                    return cloneElement(node, {
                        key: item.key,
                        ref: virtual.measureElement,
                        'data-index': item.index,
                        'data-size': item.size,
                    });
                })}
            </div>
        );
    },
    (a, b) => a.gap == b.gap && a.content === b.content,
);

function ScriptContentView({
    className,
    structure,
}: {
    className?: string;
    structure: Readonly<Structure>;
}): JSX.Element {
    const breakpoints = useBreakpoints();
    const content = useMemo(() => toFlatContent(structure), [structure]);

    return (
        <div className={classnames('flex flex-col gap-y-2 sm:gap-y-4', className)}>
            <ScriptContentViewHeader />
            <VirtualizedContentList gap={breakpoints.sm ? 16 : 8} content={content} />
        </div>
    );
}

function UserView(): JSX.Element {
    return (
        <div className="flex cursor-pointer items-center gap-x-2">
            <div className="bg-text bg-foreground h-8 w-8 rounded-full" />
            <div className="flex flex-col">
                <p>Max Mustermann</p>
                <p className="text-info text-accent-100">@Maxl</p>
            </div>
        </div>
    );
}

function ScriptInfoViewSection({
    children,
    heading,
}: {
    children?: ReactNode;
    heading: ReactNode;
}): JSX.Element {
    return (
        <div className="flex flex-col gap-y-4">
            <h3 className="font-medium">{heading}</h3>
            {children}
        </div>
    );
}

function ScriptInfoView(props: ComponentProps<typeof ContentInfoView>): JSX.Element {
    return (
        <div className="mx-9 my-2 flex w-70 flex-col gap-y-4">
            <ScriptInfoViewSection heading="Über dieses Skript">
                <ContentInfoView {...props} />
            </ScriptInfoViewSection>
            <HLine />
            <ScriptInfoViewSection heading="Mitwirkende (1)">
                <UserView />
            </ScriptInfoViewSection>
        </div>
    );
}

export class Action<Input> {
    public constructor(
        public readonly name: string,
        public readonly action: (state: TransientState, input: Input) => void,
    ) {}
}

function doEditItem(state: TransientState, { itemKey }: { itemKey: Key<EditableSectionNode> }) {
    state.replaceNode(itemKey, { editing: true });
}

function doEditDone(state: TransientState, { itemKey }: { itemKey: Key<EditableSectionNode> }) {
    state.replaceNode(itemKey, { editing: false });
}

type ChangeActorColorParams = { actorKey: ActorKey; newColor: Color };
type RenameActorParams = { actorKey: ActorKey; newName: string };

function doChangeActorColor(state: TransientState, { actorKey, newColor }: ChangeActorColorParams) {
    state.replaceNode(actorKey, { color: newColor });
}

function doRenameActor(state: TransientState, { actorKey, newName }: RenameActorParams) {
    state.replaceNode(actorKey, { name: newName });
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

export class ScriptEditorManager {
    static readonly EDIT_ITEM = new Action<{ itemKey: Key<EditableSectionNode> }>(
        'EDIT_ITEM',
        doEditItem,
    );

    static readonly CHANGE_ACTOR_COLOR = new Action<ChangeActorColorParams>(
        'CHANGE_ACTOR_COLOR',
        doChangeActorColor,
    );

    static readonly RENAME_ACTOR = new Action<RenameActorParams>('RENAME_ACTOR', doRenameActor);
    static readonly EDIT_DONE = new Action<{ itemKey: Key<EditableSectionNode> }>(
        'EDIT_DONE',
        doEditDone,
    );

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

    dispatch<Input>(action: Action<Input>, input: Input) {
        const [state, changes] = runUpdate(this.state, trans => action.action(trans, input));
        this.state = state;
        this.runChangeListeners(changes);
    }

    private runChangeListeners(changes: Set<Key<any>>) {
        for (let listener of this.listeners.get('') ?? []) listener();

        for (let key of changes.values())
            for (let listener of this.listeners.get(key) ?? []) listener();
    }
}

export function useScriptEditorManager(): ScriptEditorManager {
    return useContext(ScriptViewContextObject)!;
}

const ScriptViewContextObject = createContext<ScriptEditorManager | null>(null);

export function useScriptEditorState(): ScriptEditorState {
    const manager = useContext(ScriptViewContextObject)!;
    return useSyncExternalStore(
        listener => manager.subscribe(listener),
        () => manager.state,
    );
}

export function useScriptEditorStateAccessor<T>(
    accessor: (state: ScriptEditorState) => T,
    // valuesAreEqual?: (prev: T, next: T) => boolean
): T {
    const manager = useContext(ScriptViewContextObject)!;
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
    const manager = useContext(ScriptViewContextObject)!;
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

function ScriptViewLayout(): JSX.Element {
    const breakpoints = useBreakpoints();
    const state = useScriptEditorState();

    return (
        <div className="mx-auto flex w-full max-w-343 flex-col gap-y-2 sm:gap-y-4">
            {breakpoints.lg ? (
                <>
                    <ScriptViewHeader name={state.name} />
                    <div className="flex max-w-full flex-1">
                        <ScriptContentView className="flex-1" structure={state.structure} />
                        {breakpoints.lg && (
                            <>
                                <div className="pointer-events-none">
                                    <VLine className="absolute top-4 bottom-4 -z-2" />
                                    <VLine className="border-background relative -z-1 h-200 -translate-y-196" />
                                </div>
                                <ScriptInfoView
                                    actors={state.actors}
                                    dialogueCount={state.dialogueCount}
                                />
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {breakpoints.sm ? (
                        <ScriptViewHeader name={state.name} />
                    ) : (
                        <MobileScriptViewHeader name={state.name} />
                    )}
                    <div className="flex flex-col gap-y-3 px-3 sm:px-9">
                        <ContentInfoView
                            actors={state.actors}
                            dialogueCount={state.dialogueCount}
                        />
                    </div>
                    <HLine className="mx-3 sm:mx-9" />
                    <ScriptContentView structure={state.structure} />
                </>
            )}
        </div>
    );
}

export function ScriptEditorView({
    scrollContainerRef,
    script,
}: {
    scrollContainerRef: RefObject<HTMLElement | null>;
    script: Script;
}): JSX.Element {
    const managerRef = useRef<ScriptEditorManager>(null);
    if (managerRef.current === null) managerRef.current = new ScriptEditorManager(script);
    managerRef.current.scrollContainer = scrollContainerRef.current;

    return (
        <ScriptViewContextObject.Provider value={managerRef.current}>
            <ScriptViewLayout />
        </ScriptViewContextObject.Provider>
    );
}
