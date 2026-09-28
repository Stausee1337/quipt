import { type ReactNode, type RefObject, createContext, useEffect, useMemo, useRef, useReducer, type Dispatch, useContext } from 'react';

import type { SubmitError } from "./form";
import { Icon } from 'quipt/components/icon';

export interface BaseFlowState {
    step: string;
    latentState: Record<string, unknown>;
    errors: Partial<Record<string, SubmitError>>;
}

export interface FlowState<
    TStep extends string,
    TKeys extends string,
> extends BaseFlowState {
    step: TStep;
    errors: Partial<Record<TKeys, SubmitError>>;
    update(data: Record<TKeys, string>): void;
}

type SchemaReducer<TStep extends string, TKeys extends string, TOut extends string> = (input: {
    state: {
        transaction?: string | undefined;
        step: TStep;
        errors: any;
    },
    data: Record<TKeys, string>;
}) => Promise<{
    transaction?: string | undefined;
    step: TStep;
    errors: Partial<Record<TKeys, SubmitError>>
} | {
    transaction?: string | undefined;
    step: TOut;
    errors: {}
} | null>;

type SchemaReducerOf<TState extends FlowState<string, any>, TOut extends string> = 
    TState extends FlowState<infer TStep, infer TKeys>
        ? SchemaReducer<TStep, TKeys, TOut>
        : never;

type SerializedFlowData = {
    flowStep: string;
    flowStepCount: number;
    transaction: string | undefined;
    continueTo: string | undefined;
};

type Flow = {
    state: BaseFlowState | undefined;
    loading: boolean;
    transaction: string | undefined;
    step: number | undefined;
    continueTo: string | undefined;
};

const FlowContextObj = createContext<Flow | null>(null);

export function useFlow(): Flow {
    return useContext(FlowContextObj)!;
}

function parseFlowData(): SerializedFlowData|undefined {
    return {
        flowStep: 'identify',
        flowStepCount: 0,
        transaction: undefined,
        continueTo: ''
    };
}

type ProtoFlow = {
    state: BaseFlowState;
    step: number | undefined;
    transaction: string | undefined;
    continueTo: string | undefined;
};

function getProtoFlow(): ProtoFlow|undefined {
    const data = parseFlowData();
    if (data === undefined)
        return undefined;
    return {
        state: {
            step: data.flowStep,
            latentState: {},
            errors: {}
        },
        step: data.flowStepCount,
        transaction: data.transaction,
        continueTo: data.continueTo
    };
}

type FlowDescriptor<TStates extends FlowState<string, any>> = {
    [F in TStates as F['step']]: SchemaReducerOf<F, TStates['step']>;
};

function isValidFlowState<
    TStates extends FlowState<string, any>
>(descriptor: FlowDescriptor<TStates>, state: BaseFlowState): boolean {
    return Object.keys(descriptor).includes(state.step);
}

type ErasedFlowState = BaseFlowState & {
    update(data: Record<string, string>): void;
};

type State = {
    type: 'idle';
    state: ErasedFlowState | undefined;
} | {
    type: 'loading';
    state: ErasedFlowState | undefined;
    loadingID: string;
};

type Transition = {
    type: 'override';
    state: ErasedFlowState | undefined;
} | {
    type: 'load';
    loadingID: string;
} | {
    type: 'resolve';
    loadingID: string;
    state: ErasedFlowState;
};

function useErasedAsyncTransitionReducer(
    initialState: () => ErasedFlowState|undefined
): [{ loading: boolean; state: ErasedFlowState|undefined; }, Dispatch<Transition>] {

    const [state, dispatcher] = useReducer<State, undefined, [Transition]>((state, transition) => {
        console.log(state, transition);
        switch (transition.type) {
            case 'override':
                return {
                    type: 'idle',
                    state: transition.state
                };
            case 'load':
                if (state.type === 'idle') 
                    return {
                        type: 'loading',
                        state: state.state,
                        loadingID: transition.loadingID,
                    };
                break;
            case 'resolve':
                if (state.type === 'loading' && state.loadingID == transition.loadingID) 
                    return {
                        type: 'idle',
                        state: transition.state,
                        loadingID: transition.loadingID,
                    };
                break;
        }
        return state;
    }, undefined, () => ({ type: 'idle', state: initialState() }));


    return [
        {
            loading: state.type === 'loading',
            state: state.state
        },
        dispatcher
    ];
}

function useAsyncTransitionReducer<
    TStates extends FlowState<string, any>
>(
    initialState: () => TStates|undefined
): [{ loading: boolean; state: TStates|undefined; }, Dispatch<Transition>] {
    const [{loading, state}, dispatcher] = useErasedAsyncTransitionReducer(initialState);
    return [
        {
            loading: loading,
            state: state as TStates | undefined
        },
        dispatcher
    ];
}

function newID(length = 8): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";

    for (let i = 0; i < length; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }

    return id;
}

function createNewState(
    descriptorRef: RefObject<Record<string, SchemaReducer<string, string, string>>>,
    dispatcher: (transition: Transition) => void,
    protoState: BaseFlowState,
): ErasedFlowState {

    async function erasedReducer(
        thisState: ErasedFlowState,
        data: Record<string, string>
    ): Promise<ErasedFlowState|null> {
        const erasedDescriptor = descriptorRef.current as Record<string, SchemaReducer<string, string, string>>;
        const result = await erasedDescriptor[thisState.step]({ state: thisState, data });
        return result === null ? null : createNewState(descriptorRef, dispatcher, {
            step: result.step,
            errors: result.errors,
            latentState: { ...thisState.latentState, ...data },
        });
    }

    async function executeReduceUpdate(thisState: ErasedFlowState, data: Record<string, string>) {
        const loadingID = newID();
        dispatcher({ type: 'load', loadingID });
        const newState = await erasedReducer(thisState, data);
        if (newState !== null)
            dispatcher({ type: 'resolve', loadingID, state: newState });
    }

    const flowState = {
        ...protoState,
        update(data) {
            executeReduceUpdate(this, data);
        }
    } satisfies ErasedFlowState;
    flowState.update = flowState.update.bind(flowState);
    return Object.freeze(flowState);
}

export function useCreateFlow<
    TStates extends FlowState<string, any>
>(descriptor: FlowDescriptor<TStates>): [Flow, TStates|undefined] {
    const descriptorRef = useRef(descriptor);
    const protoFlow = useMemo(getProtoFlow, []);

    const [{ loading, state: flowState }, dispatch] = useAsyncTransitionReducer(() => {
        if (protoFlow?.state === undefined)
            return undefined;
        if (!isValidFlowState(descriptor, protoFlow.state))
            return undefined;
        return createNewState(
            descriptorRef,
            transition => dispatch(transition),
            protoFlow.state
        ) as TStates;
    });

    useEffect(() => {
        if (protoFlow?.state === undefined)
            return;
        if (!isValidFlowState(descriptor, protoFlow.state))
            dispatch({ type: 'override', state: undefined });
        descriptorRef.current = descriptor;
    }, [descriptor]);

    return [
        {
            step: protoFlow?.step,
            transaction: protoFlow?.transaction,
            state: flowState,
            continueTo: protoFlow?.continueTo,
            loading
        },
        flowState
    ];
}

export function Flow({ flow, children }: {
    flow: Flow;
    children: ReactNode;
}) {
    return (
        <FlowContextObj value={flow}>
            <div
                data-loading={flow.loading ? '' : undefined}
                className="sm:bg-accent-100/10 border-accent-100/30 flex w-full flex-col gap-6 overflow-hidden border p-8 data-loading:pointer-events-none data-loading:opacity-50 sm:mx-auto sm:w-120 sm:self-center sm:rounded-4xl">
                <Icon iconName="quipt-logo" className="text-primary mx-auto h-12 w-auto" />
                {children}
            </div>
        </FlowContextObj>
    );
}
