import {
    type ComponentProps,
    type JSX,
    type ReactNode,
    type RefObject,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
    cloneElement,
    memo,
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
import { type Script } from 'quipt/schemas/script';
import { SectionInfoHeader, renderSection } from './section';
import { HLine, VLine, ContentInfoView } from './common';
import { ScriptViewState, type Section } from '../state';

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

const ScriptContentView = memo(
    function ScriptContentView({
        sections,
        className,
        scrollContainerRef,
    }: {
        scrollContainerRef: RefObject<HTMLElement | null>;
        sections: readonly Section[];
        className?: string;
    }): JSX.Element {
        const x = useRef<HTMLDivElement | null>(null);
        const breakpoints = useBreakpoints();
        const items = useMemo(
            () => sections.flatMap(section => renderSection(section)),
            [sections],
        );
        const [enabled, setEnabled] = useState(false);
        const [scrollMargin, setScrollMargin] = useState(0);
        const virtual = useVirtualizer({
            count: items.length,
            getScrollElement: () => scrollContainerRef.current,
            estimateSize: idx => {
                const item = items[idx];
                if (item.type === SectionInfoHeader) return 150;
                return 48;
            },
            getItemKey: idx => items[idx].key ?? idx,
            scrollMargin,
            enabled,
            directDomUpdates: true,
            laneAssignmentMode: 'measured',
            gap: breakpoints.sm ? 16 : 8,
        });

        useEffect(() => {
            setEnabled(scrollContainerRef.current !== null);
        }, [scrollContainerRef.current]);

        useEffect(() => {
            if (x.current !== null) {
                const rect = x.current.getBoundingClientRect();
                console.log(rect.top);
                setScrollMargin(rect.top);
            } else {
                setScrollMargin(0);
            }
        }, [x.current]);

        function onContainerRefUpdate(element: HTMLDivElement | null) {
            virtual.containerRef(element);
            x.current = element;
        }

        return (
            <div className={classnames('flex flex-col gap-y-2 sm:gap-y-4', className)}>
                <ScriptContentViewHeader />
                <HLine className="mx-3 sm:mx-9" />
                <div className="relative" ref={onContainerRefUpdate}>
                    {virtual.getVirtualItems().map(item =>
                        cloneElement(items[item.index], {
                            key: item.key,
                            'data-index': item.index,
                            'data-size': item.size,
                            ref: virtual.measureElement,
                            // style: { transform: `translateY(${item.start}px)` }
                        }),
                    )}
                </div>
            </div>
        );
    },
    (a, b) =>
        a.sections === b.sections && a.scrollContainerRef.current === b.scrollContainerRef.current,
);

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
        public readonly action: (state: ScriptViewState, input: Input) => ScriptViewState,
    ) {}
}

function doEditItem(state: ScriptViewState, { itemID }: { itemID: string }): ScriptViewState {
    return state.replaceItem(state.getItem(itemID)!.setEditing());
}

export class ScriptViewManager {
    static readonly EDIT_ITEM = new Action<{ itemID: string }>('EDIT_ITEM', doEditItem);

    state: ScriptViewState;
    onChangeListener: (() => void) | undefined = undefined;

    constructor(script: Script) {
        this.state = ScriptViewState.create(script);
    }

    dispatch<Input>(action: Action<Input>, input: Input) {
        this.state = action.action(this.state, input);
        this.onChangeListener?.();
    }
}

export function useScriptViewManager(): ScriptViewManager {
    return useContext(ScriptViewContextObject)!;
}

const ScriptViewContextObject = createContext<ScriptViewManager | null>(null);

export function useScriptViewState(): ScriptViewState {
    return useContext(ScriptViewContextObject)!.state;
}

export function ScriptView({
    scrollContainerRef,
    script,
}: {
    scrollContainerRef: RefObject<HTMLElement | null>;
    script: Script;
}): JSX.Element {
    const managerRef = useRef<ScriptViewManager>(null);
    if (managerRef.current === null) managerRef.current = new ScriptViewManager(script);

    const breakpoints = useBreakpoints();
    const state = useSyncExternalStore(
        cb => {
            if (managerRef.current) managerRef.current.onChangeListener = cb;
            return () => {
                if (managerRef.current) managerRef.current.onChangeListener = undefined;
            };
        },
        () => managerRef.current!.state,
    );

    return (
        <ScriptViewContextObject.Provider value={managerRef.current}>
            <div className="mx-auto flex w-full max-w-343 flex-col gap-y-2 sm:gap-y-4">
                {breakpoints.lg ? (
                    <>
                        <ScriptViewHeader name={state.name} />
                        <div className="flex max-w-full flex-1">
                            <ScriptContentView
                                className="flex-1"
                                scrollContainerRef={scrollContainerRef}
                                sections={state.sections}
                            />
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
                        <ScriptContentView
                            scrollContainerRef={scrollContainerRef}
                            sections={state.sections}
                        />
                    </>
                )}
            </div>
        </ScriptViewContextObject.Provider>
    );
}
