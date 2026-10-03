import React, {
    type ComponentType,
    type JSX,
    createElement,
    useMemo,
    useContext,
} from 'react';

import {
    type DataRouteMatch,
    type LoaderFunctionArgs,
    type RouteObject,
    UNSAFE_DataRouterStateContext,
    data,
} from 'react-router'

import type { FormBaseProps, NavRenderFunction } from './form';
import { type FlowData, FlowProvider, type HandlerMap, type ErasedSchemaHandler, parseFlowData, useCreateFlow } from './flow';
import { FlowContainer } from './flow-container';


export type FlowEntry = {
    name: string;
    components: Record<string, ComponentType<FormBaseProps<string>>>,
    handlers: () => Record<string, ErasedSchemaHandler>,
    headings: Record<string, string>,
    clientEntrypoint: string;
    loader?: ((args: LoaderFunctionArgs) => void) | undefined;
    renderNavContent?: NavRenderFunction;
};

// HACK: using `keyof` can destroy inference from some reason
export type KeyOf<TData extends Record<string, Record<string, string>>> =
    TData extends Record<infer TKey, Record<string, string>> ? TKey : never;

type FlowStepComponents<TData extends Record<string, Record<string, string>>> = {
    [TStep in KeyOf<TData>]: ComponentType<FormBaseProps<keyof TData[TStep] & string>>;
};

export declare function useServerFlowData(flowName: string): Record<string, string>;

// TODO: A flow actually needs to have invariants in order to be a safe, checked flow:
// FLOW INDPENDENT:
//  - `index` is required URL param
//  - `step` is required URL param
//  - `continue` is required URL param
//  - the `continue` URL needs to stay within origin (e.g. quipt.app)
//  - if it has one, the `transaction` needs to be valid (speical 24byte binary string base64url
//    encoded, no padding + present in redis)
//    - the server provides for the `data` associated with the flow
// FLOW DEPENDENT:
//  - some flows require the user to be signed in, others require the user to be signed out
// ALSO IMPORTANT:
//  - flows that have no initial data (e.g. signin/signup) can be created fully by the client
//  - flows that require initial data (e.g. an email for display) need to be crated by the server 
//    (e.g. password reset, login method change, etc)
//  - so it might seem like flows have an entrypoint, since you definitely shouldn't have access to
//    some parts of the flow without being in others first. But there are also some flows, where
//    even the entrypoints need to be checked.
// -> we'll need to put this on the flow somewhere (probably ther'll also be a loader)
//
// IMPORATANT: You CAN SPA into a flow
export function defineFlow<TData extends Record<string, Record<string, string>>>(descriptor: {
    name: string;
    handlers: HandlerMap<TData> | (() => HandlerMap<TData>);
    clientEntrypoint: KeyOf<TData>;
    headings: Record<KeyOf<TData>, string>;
    components: FlowStepComponents<TData>;
    loader?: ((args: LoaderFunctionArgs) => void) | undefined;
    renderNavContent?: NavRenderFunction;
}): FlowEntry {
    const handlers = typeof descriptor.handlers === 'function'
            ? descriptor.handlers
            : () => descriptor.handlers;
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
    serverData: Record<string, string> | null
};

function FlowRenderer({ match }: { match: FlowMatch | undefined; }): JSX.Element | null {
    if (match === undefined) {
        if (typeof window === 'undefined')
            throw 'Internal Server Error';
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
            <FlowProvider flow={flow}
                renderNavContent={match.renderNavContent}>
                <FlowContainer>
                    {
                        createElement(
                            match.components[step],
                            { 
                                heading: match.headings[step],
                                errors: errors,
                                onDataSubmit: update,
                            }
                        )
                    }
                </FlowContainer>
            </FlowProvider>
        </>
    );
};

const flowManagerId = 'flows.flowmanager';

function processMatches(matches: DataRouteMatch[], loaderData: Record<string, any>): FlowMatch | undefined {
    const flowManagerIdx = matches.findIndex(match => match.route.id === flowManagerId);
    if (flowManagerIdx === -1) return undefined;
    const flow = matches[flowManagerIdx + 1];
    if (flow === undefined || !flow.route.id.startsWith('flows.flow.'))
        return undefined;
    const element = flow.route.element;
    if (!React.isValidElement(element))
        return undefined;
    if (element.type !== FlowEntry)
        return undefined;
    const entry = element.props as FlowEntry;
    const serverData = loaderData[flow.route.id];

    // FIXME: serverData is just not available for flows that we SPA-ed to.
    // This will persumably need to be a client fetch. At the moment returning
    // undefined here, should cause it to reload.
    if (serverData === undefined)
        return undefined;

    return {
        ...entry,
        serverData
    };
}

function FlowManager(): JSX.Element {
    const dataContext = useContext(UNSAFE_DataRouterStateContext)!;
    const loaderData = useMemo(() => dataContext.loaderData, []);
    const flowMatch = useMemo(() => processMatches(dataContext.matches, loaderData), [dataContext.matches]);
    return <FlowRenderer match={flowMatch}/>;
}

function parseTransactionString(transaction: string | undefined): Uint8Array | undefined {
    if (transaction === undefined)
        return undefined;
    let array: Uint8Array;
    try {
        array = Uint8Array.fromBase64(transaction, {
            alphabet: 'base64url',
            lastChunkHandling: 'loose'
        });
    } catch(e) {
        return undefined;
    }
    if (array.length !== 24)
        return undefined;
    // FIXME: decide on specific format
    return array;
}

type TransactionData = {
    activatedSteps: string[];
    containedData: Record<string, string> | null;
};

function lookupTransaction(transactionID: Uint8Array): TransactionData | undefined {
    return {
        activatedSteps: [],
        containedData: null
    };
}

function validateFlowData(entry: FlowEntry, data: FlowData | undefined): TransactionData | undefined {
    if (data === undefined)
        return undefined;
    if (!Object.keys(entry.components).includes(data.flowStep))
        return undefined;
    if (data.transaction === undefined && data.flowStep === entry.clientEntrypoint)
        return {
            activatedSteps: [entry.clientEntrypoint],
            containedData: null
        };
    const transactionID = parseTransactionString(data.transaction);
    if (transactionID === undefined)
        return undefined;
    const transaction = lookupTransaction(transactionID);
    if (transaction === undefined)
        return undefined;
    if (!transaction.activatedSteps.includes(data.flowStep))
        return undefined;
    return transaction;
}

function flowLoaderFactory(entry: FlowEntry) {
    return async (args: LoaderFunctionArgs) => {
        const flowData = parseFlowData(new URLSearchParams(args.url.search));
        const transactionData = validateFlowData(entry, flowData);
        if (transactionData === undefined)
            throw data('Invalid Request', { status: 400 });
        return transactionData.containedData;
    };
}

function FlowEntry(_entry: FlowEntry): JSX.Element | null {
    throw 'INVALID: this element should never be rendered';
}

export function routedFlowsManager(config: {
    basename: string,
    entries: FlowEntry[],
}): RouteObject {
    const routes = config.entries.map(entry => ({
        path: entry.name,
        element: <FlowEntry {...entry}/>,
        id: `flows.flow.${entry.name}`,
        loader: typeof window === 'undefined'
            ? flowLoaderFactory(entry)
            : undefined,
    }));
    return {
        element: <FlowManager/>,
        children: routes,
        id: flowManagerId,
    };
}

type FlowUrlCreationFunction = (flowEntry: FlowEntry) => string;

export declare function useCreateFlowUrl(): FlowUrlCreationFunction;

