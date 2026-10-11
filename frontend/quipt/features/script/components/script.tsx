import { type ComponentProps, type JSX, type ReactNode, createContext, useContext, useRef, useSyncExternalStore } from 'react';

import { Button as BaseButton } from '@base-ui/react';

import { Button } from 'quipt/components/button';
import { Icon } from 'quipt/components/icon';
import { SearchInput } from 'quipt/components/input';
import { IconButton } from 'quipt/components/icon-button';
import { Tooltip } from 'quipt/components/tooltip';
import { useBreakpoints } from 'quipt/responsive';
import { type Script } from 'quipt/schemas/script';
import { SectionView } from './section';
import { HLine, VLine, ContentInfoView, addSeparators } from './common';
import { ScriptViewState, type Section } from '../state';

function ScriptViewHeader(): JSX.Element {
    return (
        <header className="flex flex-col gap-y-2 px-9 py-2">
            <div className="flex items-center">
                <h1 className="text-heading-1">KI und K.O.</h1>
                <BaseButton className="ms-auto cursor-pointer" aria-label="Optionen">
                    <Icon iconName="three-dots-vertical" className="text-accent-100 h-7.5 w-7.5" />
                </BaseButton>
            </div>
            <HLine />
        </header>
    );
}

function MobileScriptViewHeader(): JSX.Element {
    return (
        <div className="flex flex-col items-start gap-y-2 px-3 pt-2">
            <BaseButton className="bg-accent-10 rounded-full p-2">
                <Icon iconName="chevron-left" className="icon-lg" />
            </BaseButton>
            <h1 className="text-heading-1">KI und K.O.</h1>
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

function ScriptContentView({ sections }: { sections: readonly Section[] }): JSX.Element {
    return (
        <div className="flex flex-1 flex-col gap-y-2 sm:gap-y-4">
            <ScriptContentViewHeader />
            {Array.from(
                addSeparators(
                    sections.map(section => <SectionView key={section.ID} section={section} />),
                    <HLine className="mx-3 sm:mx-9" />,
                ),
            )}
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
        public readonly action: (
            state: ScriptViewState,
            input: Input
        ) => ScriptViewState
    ) {}
}

function doEditItem(state: ScriptViewState, { itemID }: { itemID: string }): ScriptViewState {
    return state.replaceItem(state.getItem(itemID)!.setEditing());
}

export class ScriptViewManager {
    static readonly EDIT_ITEM = new Action<{ itemID: string; }>('EDIT_ITEM', doEditItem);

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

export function ScriptView({ script }: { script: Script; }): JSX.Element {
    const managerRef = useRef<ScriptViewManager>(null);
    if (managerRef.current === null)
        managerRef.current = new ScriptViewManager(script);

    const breakpoints = useBreakpoints();
    const state = useSyncExternalStore(cb => {
        if (managerRef.current)
            managerRef.current.onChangeListener = cb;
        return () => {
            if (managerRef.current)
                managerRef.current.onChangeListener = undefined;
        };
    },
    () => managerRef.current!.state);

    return (
        <ScriptViewContextObject.Provider value={managerRef.current}>
            <div className="mx-auto flex w-full max-w-343 flex-col gap-y-2 sm:gap-y-4">
                {breakpoints.lg ? (
                    <>
                        <ScriptViewHeader />
                        <div className="flex max-w-full flex-1">
                            <ScriptContentView sections={state.sections} />
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
                        {breakpoints.sm ? <ScriptViewHeader /> : <MobileScriptViewHeader />}
                        <div className="flex flex-col gap-y-3 px-3 sm:px-9">
                            <ContentInfoView
                                actors={state.actors}
                                dialogueCount={state.dialogueCount}
                            />
                        </div>
                        <HLine className="mx-3 sm:mx-9" />
                        <ScriptContentView sections={state.sections} />
                    </>
                )}
            </div>
        </ScriptViewContextObject.Provider>
    );
}
