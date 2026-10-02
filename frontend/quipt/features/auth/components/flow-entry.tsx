import {
    type ComponentType,
    type JSX,
    createElement
} from 'react';

import { type LoaderFunctionArgs, type RouteObject, data, useLoaderData } from 'react-router'

import type { FormBaseProps } from './form';
import { type FlowData, FlowProvider, type HandlerMap, parseFlowData, useCreateFlow } from './flow';
import { FlowContainer } from './flow-container';


export type FlowEntry = {
    route: RouteObject;
};

// HACK: using `keyof` can destroy inference from some reason
export type KeyOf<TData extends Record<string, Record<string, string>>> =
    TData extends Record<infer TKey, Record<string, string>> ? TKey : never;

type FlowStepComponents<TData extends Record<string, Record<string, string>>> = {
    [TStep in KeyOf<TData>]: ComponentType<FormBaseProps<keyof TData[TStep] & string>>;
};

export type FlowServerData = FlowData & {
    flowName: string;
};

export function useServerFlowData(flowName: string): FlowServerData | undefined {
    // FIXME: Idk if this has stable identity
    const data = useLoaderData<FlowServerData | undefined>();

    if (import.meta.env.SSR)
        return data;

    // NOTE: this might be a bit much, since it relies on the assumption that
    // `data === undefined` === Server Will Throw
    if (data === undefined) {
        // window.location.reload();
        return undefined;
    }

    if (data.flowName !== flowName) // The data we got was meant for a different flow
        return undefined;

    return data; 
}

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
    headings: Record<KeyOf<TData>, string>;
    components: FlowStepComponents<TData>;
}): FlowEntry {
    function FlowComponent(): JSX.Element {
        const handlers = typeof descriptor.handlers === 'function'
            ? descriptor.handlers()
            : descriptor.handlers;

        const flowData = useServerFlowData(descriptor.name);

        const [flow, stepState] = useCreateFlow<TData>(handlers, { flowData });

        if (flow === undefined) throw 'Internal Server Error';
        
        const { errors, step, update } = stepState;

        return (
            <>
                <title>{`${descriptor.headings[step as KeyOf<TData>]} - Quipt`}</title>
                <FlowProvider flow={flow}
                    renderNavContent={undefined /* TODO: flowMangementContext */ }>
                    <FlowContainer>
                        {
                            createElement(
                                descriptor.components[step as KeyOf<TData>],
                                { 
                                    heading: descriptor.headings[step as KeyOf<TData>],
                                    errors: errors,
                                    onDataSubmit: update,
                                }
                            )
                        }
                    </FlowContainer>
                </FlowProvider>
            </>
        );
    }

    // FIXME: I don't think it is any smart to copy this same loader for every flow
    async function flowLoader(args: LoaderFunctionArgs): Promise<FlowServerData> {
        const flowData = parseFlowData({
            search: args.url.search,
            hash: args.url.hash,
            pathname: args.url.pathname,
            state: undefined,
            key: 'default'
        }); 
        if (flowData === undefined)
            throw data('Invalid Request', { status: 400 });
        return {
            ...flowData,
            flowName: descriptor.name
        };
    }

    return {
        route: {
            path: descriptor.name,
            Component: FlowComponent,
            loader: import.meta.env.SSR ? flowLoader : undefined
        },
    };
}

type FlowUrlCreationFunction = (flowEntry: FlowEntry) => string;

export declare function useCreateFlowUrl(): FlowUrlCreationFunction;

