import React, {
    type ComponentProps,
    type ComponentType,
    type JSX,
    createElement,
    useMemo,
    useContext,
    useState,
    useEffect,
} from 'react';

import {
    type DataRouteMatch,
    type LoaderFunctionArgs,
    type Location,
    type RouteObject,
    UNSAFE_DataRouterStateContext,
} from 'react-router';

import { StyledLink } from 'quipt/components/link';
import type { FormBaseProps, NavRenderFunction } from './form';
import {
    type FlowData,
    FlowProvider,
    type HandlerMap,
    type ErasedSchemaHandler,
    parseFlowData,
    serializeFlowDataToURLParams,
    useCreateFlow,
    useFlow,
    type Flow,
} from './flow';
import { FlowContainer } from './flow-container';
import * as server from './flow-entry.server';

export type TransactionData = {
    flowName: string;
    activatedSteps: string[];
    containedData: Record<string, string> | null;
};

export type FlowLoaderFunction = (
    args: LoaderFunctionArgs,
    entry: FlowEntry,
    flowData: FlowData,
    transaction: TransactionData
) => Promise<void>;

export type FlowEntry = {
    name: string;
    components: Record<string, ComponentType<FormBaseProps<string>>>;
    handlers: () => Record<string, ErasedSchemaHandler>;
    headings: Record<string, string>;
    clientEntrypoint: string;
    loader?: FlowLoaderFunction | undefined;
    renderNavContent?: NavRenderFunction | undefined;
};

// HACK: using `keyof` can destroy inference from some reason
export type KeyOf<TData extends Record<string, Record<string, string>>> =
    TData extends Record<infer TKey, Record<string, string>> ? TKey : never;

type FlowStepComponents<TData extends Record<string, Record<string, string>>> = {
    [TStep in KeyOf<TData>]: ComponentType<FormBaseProps<keyof TData[TStep] & string>>;
};

export function defineFlow<TData extends Record<string, Record<string, string>>>(descriptor: {
    name: string;
    handlers: HandlerMap<TData> | (() => HandlerMap<TData>);
    clientEntrypoint: KeyOf<TData>;
    headings: Record<KeyOf<TData>, string>;
    components: FlowStepComponents<TData>;
    loader?: FlowLoaderFunction | undefined;
    renderNavContent?: NavRenderFunction | undefined;
}): FlowEntry {
    const handlers =
        typeof descriptor.handlers === 'function' ? descriptor.handlers : () => descriptor.handlers;
    return {
        name: descriptor.name,
        components: descriptor.components,
        clientEntrypoint: descriptor.clientEntrypoint,
        handlers: handlers as any,
        headings: descriptor.headings,
        loader: descriptor.loader,
        renderNavContent: descriptor.renderNavContent,
    };
}

type FlowMatch = FlowEntry & {
    serverData: Record<string, string> | null;
};

function FlowRenderer({ match }: { match: FlowMatch | undefined }): JSX.Element | null {
    if (match === undefined) {
        if (import.meta.env.SSR) throw 'Internal Server Error';
        window.location.reload();
        return null;
    }

    const handlers = match.handlers();

    const [flow, stepState] = useCreateFlow(handlers, match.serverData ?? undefined);

    if (flow === undefined) throw 'Internal Server Error';

    const { errors, step, update } = stepState;

    return (
        <>
            <title>{`${match.headings[step]} - Quipt`}</title>
            <FlowProvider flow={flow} renderNavContent={match.renderNavContent}>
                <FlowContainer>
                    {createElement(match.components[step], {
                        heading: match.headings[step],
                        errors: errors,
                        onDataSubmit: update,
                    })}
                </FlowContainer>
            </FlowProvider>
        </>
    );
}

const flowManagerId = 'flows.flowmanager';

function validateFlowDataClient(entry: FlowEntry, data: FlowData | undefined): boolean {
    if (data === undefined) return false;
    if (data.transaction === undefined && data.flowStep === entry.clientEntrypoint) return true;
    return false;
}

function processMatches(
    matches: DataRouteMatch[],
    location: Location,
    loaderData: Record<string, any>,
): FlowMatch | undefined {
    const flowManagerIdx = matches.findIndex(match => match.route.id === flowManagerId);
    if (flowManagerIdx === -1) return undefined;

    const flow = matches[flowManagerIdx + 1];
    if (flow === undefined || !flow.route.id.startsWith('flows.flow.')) return undefined;

    const element = flow.route.element;
    if (!React.isValidElement(element)) return undefined;
    if (element.type !== FlowEntry) return undefined;

    const entry = element.props as FlowEntry;
    const serverData = loaderData[flow.route.id];

    if (serverData !== undefined) return { ...entry, serverData };

    const flowData = parseFlowData(new URLSearchParams(location.search));
    if (!validateFlowDataClient(entry, flowData)) return undefined;
    return { ...entry, serverData: null };
}

function FlowManager(): JSX.Element {
    const dataContext = useContext(UNSAFE_DataRouterStateContext)!;
    const loaderData = useMemo(() => dataContext.loaderData, []);
    const flowMatch = useMemo(
        () => processMatches(dataContext.matches, dataContext.location, loaderData),
        [dataContext.matches, dataContext.location],
    );
    return <FlowRenderer match={flowMatch} key={flowMatch?.name} />;
}

function FlowEntry(_entry: FlowEntry): JSX.Element | null {
    throw 'INVALID: this element should never be rendered';
}

export function routedFlowsManager(...entries: FlowEntry[]): RouteObject {
    const routes = entries.map(entry => ({
        path: entry.name,
        element: <FlowEntry {...entry} />,
        id: `flows.flow.${entry.name}`,
        loader: import.meta.env.SSR ? server.flowLoaderFactory(entry) : undefined,
    }));
    return {
        element: <FlowManager />,
        children: routes,
        id: flowManagerId,
    };
}

function normalizeUrl(urlOrPath: string): string {
    const url = new URL(urlOrPath, window.location.origin);
    return url.toString();
}

export function useFlowUrl(flowEntry: FlowEntry, continueTo?: string | undefined): string | undefined {
    const [isHydrated, setIsHydrated] = useState(false);
    const currentFlow = useFlow() as (Flow | undefined);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    return useMemo(() => {
        if (!isHydrated) return undefined;

        const flowData = {
            flowStep: flowEntry.clientEntrypoint,
            flowStepIndex: 0,
            transaction: undefined,
            continueTo: continueTo !== undefined 
                ? normalizeUrl(continueTo)
            : (currentFlow?.continueTo ?? window.location.toString()),
        } satisfies FlowData;

        return `/auth/${flowEntry.name}?${serializeFlowDataToURLParams(flowData)}`;
    }, [flowEntry, isHydrated]);
}

interface FlowLinkPropsBase extends Omit<ComponentProps<'a'>, 'href'> {
    continueTo?: string | undefined;
}

interface FlowLinkProps extends FlowLinkPropsBase {
    to: FlowEntry;
}

interface FlowAnchorProps extends FlowLinkPropsBase {
    href: FlowEntry;
}

function isLinkProps(props: FlowAnchorProps | FlowLinkProps): props is FlowLinkProps {
    return Object.keys(props).includes('to');
}

export function FlowLink(props: FlowAnchorProps | FlowLinkProps): JSX.Element {
    if (isLinkProps(props)) {
        const { to, continueTo, ...rest } = props;
        const url = useFlowUrl(to, continueTo);
        return <StyledLink to={url} {...rest} />;
    }
    const { href, continueTo, ...rest } = props;
    const url = useFlowUrl(href, continueTo);
    return <StyledLink href={url} {...rest} />;
}
