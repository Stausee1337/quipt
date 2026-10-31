import {
    type ComponentProps,
    type JSX,
    type ReactNode,
    cloneElement,
    memo,
    useEffect,
    useMemo,
    useRef,
    useState,
    type Ref,
    type Dispatch,
} from 'react';

import { Button as BaseButton, Popover, Toggle } from '@base-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import classnames from 'classnames';

import { Button } from 'quipt/components/button';
import { Icon } from 'quipt/components/icon';
import { SearchInput } from 'quipt/components/input';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';
import { useBreakpoints } from 'quipt/responsive';
import { useNativeElementListener } from 'quipt/utils';
import { type Script } from '../script';
import { renderContentNode } from './section';
import { HLine, VLine, ContentInfoView, PlayButton } from './common';
import {
    SectionNode,
    type Key,
    ScriptNode,
    type Structure,
    keyOfType,
    DialogueNode,
    ScriptEditorState,
    ActionNode,
} from '../model/state';
import {
    ScriptEditorContextProivder,
    useKeyedState,
    useScriptEditorManager,
    useScriptEditorManagerListener,
    useScriptEditorStateAccessor,
    useScrollContainer,
} from '../model/hooks';
import * as actions from '../model/actions';
import {
    dispatchStateActionEvent,
    ScriptEditorManager,
    scrollToNodeEvent,
    setActiveSectionEvent,
    toggleContextHiddenEvent,
    undoEvent,
} from '../model/manager';

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

interface SectionNavigatorItemProps extends Omit<ComponentProps<'div'>, 'children'> {
    sectionKey: Key<SectionNode>;
    selectedItemRef?: Ref<HTMLDivElement | null> | undefined;
}

function SectionNavigatorItem({
    sectionKey,
    selectedItemRef,
    onClick,
    ...props
}: SectionNavigatorItemProps): JSX.Element {
    const section = useKeyedState(sectionKey);
    const manager = useScriptEditorManager();
    const selected = sectionKey === manager.activeSection;

    const clickHandler: SectionNavigatorItemProps['onClick'] = event => {
        manager.scrollToNode(section.key);
        onClick?.(event);
    };

    return (
        <div
            ref={selected ? selectedItemRef : undefined}
            className="data-selected:bg-accent-100/20 hover:not-data-selected:bg-accent-100/10 cursor-pointer rounded-lg px-3 py-1 text-sm data-[level=1]:ps-4"
            data-selected={selected ? '' : undefined}
            data-level={section.depth}
            onClick={clickHandler}
            {...props}>
            {section.name}
        </div>
    );
}

function ScriptSectionNavigatorContent({
    popoverHandle,
    setSelectedItem,
}: {
    popoverHandle: Popover.Handle<void>;
    setSelectedItem: Dispatch<HTMLDivElement | null>;
}): JSX.Element {
    const manager = useScriptEditorManager();
    const structure = manager.state.structure;
    const content = useMemo(() => {
        switch (structure.depth) {
            case 0:
                return [];
            case 1:
                return structure.children
                    .filter(
                        section =>
                            processMapScriptItems(
                                section.children,
                                manager.state,
                                manager.contextHidden,
                            ).length > 0,
                    )
                    .map(section => (
                        <SectionNavigatorItem
                            key={section.key}
                            selectedItemRef={setSelectedItem}
                            sectionKey={section.key}
                            onClick={closeOnClick}
                        />
                    ));
            case 2:
                return structure.children.flatMap(section => {
                    const items = section.children
                        .filter(
                            section =>
                                processMapScriptItems(
                                    section.children,
                                    manager.state,
                                    manager.contextHidden,
                                ).length > 0,
                        )
                        .map(section => (
                            <SectionNavigatorItem
                                key={section.key}
                                selectedItemRef={setSelectedItem}
                                sectionKey={section.key}
                                onClick={closeOnClick}
                            />
                        ));
                    return items.length > 0
                        ? [
                              <SectionNavigatorItem
                                  key={section.key}
                                  selectedItemRef={setSelectedItem}
                                  sectionKey={section.key}
                                  onClick={closeOnClick}
                              />,
                              ...items,
                          ]
                        : [];
                });
        }
    }, []);

    function closeOnClick() {
        popoverHandle.close();
    }

    return <>{content}</>;
}

function ScriptSectionNavigator(): JSX.Element {
    const popoverHandleRef = useRef<Popover.Handle<void>>(null!);
    if (popoverHandleRef.current === null) popoverHandleRef.current = Popover.createHandle();

    const popupContainerRef = useRef<HTMLDivElement>(null);
    const [selectedItem, setSelectedItem] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        selectedItem && selectedItem.scrollIntoView({ block: 'center' });
    }, [selectedItem]);

    return (
        <Popover.Root modal handle={popoverHandleRef.current}>
            <Tooltip label="Übersicht">
                <IconButton
                    className="data-popup-open:bg-accent-100/20"
                    iconName="list-nested"
                    render={<Tooltip.Trigger render={<Popover.Trigger />} />}
                />
            </Tooltip>
            <Popover.Portal>
                <Popover.Positioner side="bottom" align="center" sideOffset={4}>
                    <Popover.Popup
                        ref={popupContainerRef}
                        className="bg-accent-20 flex max-h-125 w-80 scrollbar-none flex-col gap-1 overflow-y-auto rounded-3xl p-4 shadow-xl/50 outline-hidden">
                        <ScriptSectionNavigatorContent
                            popoverHandle={popoverHandleRef.current}
                            setSelectedItem={setSelectedItem}
                        />
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

function ScriptContentViewHeader(): JSX.Element {
    const breakpoints = useBreakpoints();
    const manager = useScriptEditorManager();
    const hasSelfActor = useScriptEditorStateAccessor(state => state.selfActor !== null);
    const hasStructure = useScriptEditorStateAccessor(state => state.structure.depth > 0);

    const [contextHidden, setContentHidden] = useState(manager.contextHidden);
    const [hasHistory, setHasHistory] = useState(manager.history.length > 0);

    function undoHandler() {
        manager.undo();
    }

    useScriptEditorManagerListener(() => {
        setContentHidden(manager.contextHidden);
    }, toggleContextHiddenEvent);

    useScriptEditorManagerListener(() => {
        setHasHistory(manager.history.length > 0);
    }, [undoEvent, dispatchStateActionEvent]);

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
                    <IconButton
                        disabled={!hasHistory}
                        iconName="arrow-counterclockwise"
                        onClick={undoHandler}
                        render={<Tooltip.Trigger />}
                    />
                </Tooltip>
                <Tooltip label={contextHidden ? 'Kontext einblenden' : 'Kontext ausblenden'}>
                    {
                        <Toggle
                            onClick={() => manager.toggleContextHidden()}
                            pressed={contextHidden && hasSelfActor}
                            disabled={!hasSelfActor}
                            render={(props, state) => (
                                <IconButton
                                    iconName={state.pressed ? 'eye' : 'eye-slash'}
                                    render={<Tooltip.Trigger />}
                                    {...props}
                                />
                            )}
                        />
                    }
                </Tooltip>
                {hasStructure && <ScriptSectionNavigator />}
            </div>
        </header>
    );
}

type FlatContentItem = {
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

function processMapScriptItems(
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

function toFlatContent(
    structure: Readonly<Structure>,
    state: ScriptEditorState,
    hideContext: boolean,
): FlatContentItem[] {
    switch (structure.depth) {
        case 0:
            return processMapScriptItems(structure.children, state, hideContext);
        case 1:
            return structure.children.flatMap(sectionPack => {
                const items = processMapScriptItems(sectionPack.children, state, hideContext);
                return items.length > 0
                    ? [{ key: sectionPack.key, estimatedHeight: 150 }, ...items]
                    : [];
            });
        case 2:
            return structure.children.flatMap(supersectionPack => {
                const items = supersectionPack.children.flatMap(sectionPack => {
                    const items = processMapScriptItems(sectionPack.children, state, hideContext);
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

function getActiveSection(manager: ScriptEditorManager): SectionNode | null {
    if (manager.activeSection === null) return null;
    let activeSection: SectionNode;
    try {
        activeSection = manager.state.lookup(manager.activeSection);
    } catch {
        return null;
    }
    if (activeSection.parent === null) return activeSection;
    let activeSupersection: SectionNode;
    try {
        activeSupersection = manager.state.lookup(activeSection.parent);
    } catch {
        return null;
    }
    return activeSupersection;
}

function ScriptStickyHeader(): JSX.Element {
    const manager = useScriptEditorManager();
    const scriptName = useScriptEditorStateAccessor(state => state.name);
    const hasSelfActor = useScriptEditorStateAccessor(state => state.selfActor !== null);
    const hasStructure = useScriptEditorStateAccessor(state => state.structure.depth > 0);

    const [contextHidden, setContentHidden] = useState(manager.contextHidden);
    const [hasHistory, setHasHistory] = useState(manager.history.length > 0);

    const [activeSection, setActiveSection] = useState(getActiveSection(manager));

    useScriptEditorManagerListener(() => {
        setContentHidden(manager.contextHidden);
    }, toggleContextHiddenEvent);

    useScriptEditorManagerListener(() => {
        setActiveSection(getActiveSection(manager));
    }, setActiveSectionEvent);

    useScriptEditorManagerListener(() => {
        setHasHistory(manager.history.length > 0);
    }, [undoEvent, dispatchStateActionEvent]);

    function undoHandler() {
        manager.undo();
    }

    // FIXME: when toggling context hidden while scrolled, react virtualizer tries to maintain
    // scroll position, not element, which means after a context hidden change we come out all over
    // the place. We likely have to track some sort of anchor item (the item in the middle of the
    // screen) in order to mitigate that (though that anchor item would also need to be part of the
    // current context, obviously)

    return (
        <div className="bg-background sticky top-0 z-100 w-auto">
            <div className="border-accent-30 mx-3 sm:mx-9 flex items-center border-b py-2">
                <div className="flex items-center gap-x-5">
                    <h2 className="text-heading-2">{activeSection?.name ?? scriptName}</h2>
                    <div className="flex items-center gap-x-2">
                        <Tooltip label="Rückgängig">
                            <IconButton
                                disabled={!hasHistory}
                                iconName="arrow-counterclockwise"
                                onClick={undoHandler}
                                render={<Tooltip.Trigger />}
                            />
                        </Tooltip>
                        <Tooltip
                            label={contextHidden ? 'Kontext einblenden' : 'Kontext ausblenden'}>
                            {
                                <Toggle
                                    onClick={() => manager.toggleContextHidden()}
                                    pressed={contextHidden && hasSelfActor}
                                    disabled={!hasSelfActor}
                                    render={(props, state) => (
                                        <IconButton
                                            iconName={state.pressed ? 'eye' : 'eye-slash'}
                                            render={<Tooltip.Trigger />}
                                            {...props}
                                        />
                                    )}
                                />
                            }
                        </Tooltip>
                        {hasStructure && <ScriptSectionNavigator />}
                    </div>
                </div>
                <PlayButton className="ms-auto" />
            </div>
        </div>
    );
}

const VirtualizedContentList = memo(
    function VirtualizedContentList({ gap, content }: { gap: number; content: FlatContentItem[] }) {
        const containerRef = useRef<HTMLDivElement | null>(null);
        const breakpoints = useBreakpoints();
        const manager = useScriptEditorManager();

        const [enabled, setEnabled] = useState(false);
        const [scrollMargin, setScrollMargin] = useState(0);
        const [stickyHeaderActive, setHeaderActive] = useState(false);
        const scrollContainer = useScrollContainer();

        const virtualizer = useVirtualizer({
            count: content.length,
            getScrollElement: () => scrollContainer,
            estimateSize: idx => content[idx].estimatedHeight,
            getItemKey: idx => content[idx].key,
            gap,
            enabled,
            scrollMargin,
            directDomUpdates: true,
            laneAssignmentMode: 'measured',
            onChange() {
                recomputeActiveSection();
            },
        });

        function recomputeActiveSection() {
            const virtualItems = virtualizer.getVirtualItems();
            const scrollOffset = virtualizer.scrollOffset ?? 0;
            const scrollMargin = virtualizer.options.scrollMargin ?? 0;

            const currentItem = virtualItems.find(
                item =>
                    item.start - scrollMargin <= scrollOffset &&
                    item.end - scrollMargin > scrollOffset,
            );

            if (currentItem === undefined) return;

            const fci = content[currentItem.index];
            if (keyOfType(fci.key, SectionNode)) {
                manager.setActiveSection(fci.key);
                return;
            }
            const scriptNode = manager.state.lookup(fci.key);
            manager.setActiveSection(scriptNode.parent);
        }

        useNativeElementListener(scrollContainer, 'scroll', () => {
            if (containerRef.current === null) return;
            const rect = containerRef.current.getBoundingClientRect();
            setHeaderActive(rect.top <= 0);
        });

        useScriptEditorManagerListener(key => {
            const nodeIndex = content.findIndex(item => item.key === key);
            if (nodeIndex === -1) return;
            const result = virtualizer.getOffsetForIndex(nodeIndex, 'start');
            if (result === undefined) return;
            virtualizer.scrollToOffset(result[0] - 65, { align: 'start' });
        }, scrollToNodeEvent);

        useEffect(() => {
            recomputeActiveSection();
        }, [content]);

        useEffect(() => {
            setEnabled(scrollContainer !== null);
        }, [scrollContainer]);

        useEffect(() => {
            if (containerRef.current !== null) {
                setScrollMargin(containerRef.current.offsetTop);
            } else {
                setScrollMargin(0);
            }
        }, [breakpoints]);

        function onContainerRefUpdate(element: HTMLDivElement | null) {
            virtualizer.containerRef(element);
            containerRef.current = element;
        }

        return (
            <div className="relative" ref={onContainerRefUpdate}>
                {stickyHeaderActive && <ScriptStickyHeader />}

                {virtualizer.getVirtualItems().map(item => {
                    const node = renderContentNode(content[item.index].key);
                    if (node === null) return null;
                    return cloneElement(node, {
                        key: item.key,
                        ref: virtualizer.measureElement,
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
    const manager = useScriptEditorManager();
    const selfActor = useScriptEditorStateAccessor(state => state.selfActor);

    // FXIME: this is definitely an antipattern
    const [externalContentEvents, setExternalContentEvents] = useState(0);

    const [contextHidden, setContextHidden] = useState(manager.contextHidden);
    const content = useMemo(
        () => toFlatContent(structure, manager.state, contextHidden),
        [structure, contextHidden, selfActor, externalContentEvents],
    );

    useScriptEditorManagerListener(() => {
        setContextHidden(manager.contextHidden);
    }, toggleContextHiddenEvent);

    useScriptEditorManagerListener(info => {
        if (!manager.contextHidden || manager.state.selfActor === null) return;
        if (info.action !== actions.toggleNodeMarkedAsContext) return;
        setExternalContentEvents(c => c + 1);
    }, dispatchStateActionEvent);

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

function ScriptViewLayout(): JSX.Element {
    const breakpoints = useBreakpoints();
    const name = useScriptEditorStateAccessor(state => state.name);
    const structure = useScriptEditorStateAccessor(state => state.structure);
    const actors = useScriptEditorStateAccessor(state => state.actors);
    const dialogueCount = useScriptEditorStateAccessor(state => state.dialogueCount);

    return (
        <div className="mx-auto flex w-full max-w-343 flex-col gap-y-2 sm:gap-y-4">
            {breakpoints.sm ? (
                <ScriptViewHeader name={name} />
            ) : (
                <MobileScriptViewHeader name={name} />
            )}
            {!breakpoints.lg && (
                <>
                    <div className="flex flex-col gap-y-3 px-3 sm:px-9">
                        <ContentInfoView actors={actors} dialogueCount={dialogueCount} />
                    </div>
                    <HLine className="mx-3 sm:mx-9" />
                </>
            )}
            <div className={breakpoints.lg ? 'flex max-w-full flex-1' : 'contents'}>
                <ScriptContentView className="flex-1" structure={structure} />
                {breakpoints.lg && (
                    <>
                        <div className="pointer-events-none">
                            <VLine className="absolute top-4 bottom-4 -z-2" />
                            <VLine className="border-background relative -z-1 h-200 -translate-y-196" />
                        </div>
                        <ScriptInfoView actors={actors} dialogueCount={dialogueCount} />
                    </>
                )}
            </div>
        </div>
    );
}

export function ScriptEditorView({
    scrollContainer,
    script,
}: {
    scrollContainer: HTMLElement | null;
    script: Script;
}): JSX.Element | null {
    const managerRef = useRef<ScriptEditorManager>(null);
    if (managerRef.current === null) managerRef.current = new ScriptEditorManager(script);

    useNativeElementListener(window.document.documentElement, 'keydown', event => {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
            managerRef.current?.undo();
        }

    });

    return managerRef.current !== null ? (
        <ScriptEditorContextProivder manager={managerRef.current} scrollContainer={scrollContainer}>
            <ScriptViewLayout />
        </ScriptEditorContextProivder>
    ) : null;
}
