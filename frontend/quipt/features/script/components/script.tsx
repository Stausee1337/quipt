import {
    type ComponentProps,
    type JSX,
    type ReactNode,
    type RefObject,
    cloneElement,
    memo,
    useEffect,
    useMemo,
    useRef,
    useState,
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
import { type Script } from '../script';
import { renderContentNode } from './section';
import { HLine, VLine, ContentInfoView } from './common';
import { type Key, type ScriptNode, type Structure } from '../model/state';
import {
    ScriptEditorManagerProivder,
    useScriptEditorManager,
    useScriptEditorStateAccessor,
} from '../model/hooks';
import { ScriptEditorManager } from '../model/manager';

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

function ScriptViewLayout(): JSX.Element {
    const breakpoints = useBreakpoints();
    const name = useScriptEditorStateAccessor(state => state.name);
    const structure = useScriptEditorStateAccessor(state => state.structure);
    const actors = useScriptEditorStateAccessor(state => state.actors);
    const dialogueCount = useScriptEditorStateAccessor(state => state.dialogueCount);

    return (
        <div className="mx-auto flex w-full max-w-343 flex-col gap-y-2 sm:gap-y-4">
            {breakpoints.lg ? (
                <>
                    <ScriptViewHeader name={name} />
                    <div className="flex max-w-full flex-1">
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
                </>
            ) : (
                <>
                    {breakpoints.sm ? (
                        <ScriptViewHeader name={name} />
                    ) : (
                        <MobileScriptViewHeader name={name} />
                    )}
                    <div className="flex flex-col gap-y-3 px-3 sm:px-9">
                        <ContentInfoView actors={actors} dialogueCount={dialogueCount} />
                    </div>
                    <HLine className="mx-3 sm:mx-9" />
                    <ScriptContentView structure={structure} />
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

    useEffect(() => {
        const keydownListener = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === 'z') {
                event.preventDefault();
                managerRef.current?.undo();
            }
        };

        window.addEventListener('keydown', keydownListener);
        return () => {
            window.removeEventListener('keydown', keydownListener);
        };
    }, []);

    return (
        <ScriptEditorManagerProivder value={managerRef.current}>
            <ScriptViewLayout />
        </ScriptEditorManagerProivder>
    );
}
