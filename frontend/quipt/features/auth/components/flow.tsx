import {
    type ReactNode,
    type RefObject,
    type Dispatch,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
} from 'react';

import { type Location, useLocation, useNavigate } from 'react-router';

import type { SubmitError } from './form';

export interface BaseFlowStepState {
    step: string;
    errors: Partial<Record<string, SubmitError>>;
}

export interface FlowStepState<TStep extends string, TKeys extends string> extends BaseFlowStepState {
    step: TStep;
    errors: Partial<Record<TKeys, SubmitError>>;
    update(data: Record<TKeys, string>): void;
}

type SchemaReducer<TStep extends string, TKeys extends string, TOut extends string> = (input: {
    state: {
        transaction?: string | undefined;
        step: TStep;
        errors: any;
    };
    data: Record<TKeys, string>;
}) => Promise<
    | {
          transaction?: string | undefined;
          step: TStep;
          errors: Partial<Record<TKeys, SubmitError>>;
      }
    | {
          transaction?: string | undefined;
          step: TOut;
          errors: {};
      }
    | null
>;

type SchemaReducerOf<TState extends FlowStepState<string, any>, TOut extends string> =
    TState extends FlowStepState<infer TStep, infer TKeys> ? SchemaReducer<TStep, TKeys, TOut> : never;

type FlowData = {
    flowStep: string;
    flowStepIndex: number;
    transaction: string | undefined;
    continueTo: string;
};

export type FlowState = {
    stepIndex: number;
    stepState: ErasedFlowStepState;
    transaction: string | undefined;
    data: Record<string, string>;
};

export type Flow = {
    done: boolean;
    loading: boolean;
    continueTo: string;
    state: FlowState;
};

const FlowContextObj = createContext<Flow | null>(null);

export function useFlow(): Flow {
    return useContext(FlowContextObj)!;
}

function parseFlowData(location: Location): FlowData | undefined {
    const params = new URLSearchParams(location.search);

    const step = params.get('step');
    if (step === null) return undefined;

    const indexString = params.get('index');
    if (indexString === null)
        return undefined;

    const index = parseInt(indexString);
    if (Number.isNaN(index)) return undefined;

    const transaction = params.get('t') ?? undefined;
    const continueTo = params.get('continue');
    if (continueTo === null)
        return undefined;

    return {
        flowStep: step,
        flowStepIndex: index,
        transaction,
        continueTo,
    };
}

function toFlowData(flow: Flow): FlowData {
    return {
        flowStep: flow.state.stepState.step,
        flowStepIndex: flow.state.stepIndex,
        continueTo: flow.continueTo,
        transaction: flow.state.transaction,
    };
}

function isFlowDataEq(a: FlowData, b: FlowData): boolean {
    return a.flowStep === b.flowStep
        && a.flowStepIndex === b.flowStepIndex
        && a.transaction === b.transaction
        && a.continueTo === b.continueTo;
}

function serializeFlowDataToURLParams(flowData: FlowData): string {
    const params = new URLSearchParams();
    if (flowData.transaction !== undefined)
        params.append('t', flowData.transaction);

    if (flowData.continueTo !== undefined)
        params.append('continue', flowData.continueTo);

    params.append('step', flowData.flowStep);

    if (flowData.flowStepIndex !== undefined)
        params.append('index', String(flowData.flowStepIndex));

    return params.toString();
}

export type FlowDescriptor<TStates extends FlowStepState<string, any>> = {
    [F in TStates as F['step']]: SchemaReducerOf<F, TStates['step']>;
};

function isValidFlowStep(
    descriptor: Record<string, SchemaReducer<string, string, string>>,
    step: string,
): boolean {
    return Object.keys(descriptor).includes(step);
}

type ErasedFlowStepState = BaseFlowStepState & {
    update(data: Record<string, string>): void;
};

type ResolveResult = {
    stepState: ErasedFlowStepState | null;
    transaction: string | undefined;
    data: Record<string, string>;
};

type ResolveTransition = ResolveResult & {
    type: 'resolve';
    loadingID: string;
};

type Transition = {
    type: 'override';
    flowState: FlowState | undefined;
} | {
    type: 'load';
    loadingID: string;
} | ResolveTransition;

type UseFlowReducer = [
    Flow | undefined,
    Dispatch<Transition>
];

function createFlowState(
    descriptorRef: RefObject<Record<string, SchemaReducer<string, string, string>>>,
    flowData: FlowData,
    disptach: Dispatch<Transition>,
    data?: Record<string, string> | undefined
): FlowState {
    return {
        stepState: createStepState(
            descriptorRef,
            disptach,
            flowData.flowStep,
        ),
        stepIndex: flowData.flowStepIndex,
        transaction: flowData.transaction,
        data: data ?? {}
    };
}

function useFlowReducer(
    descriptor: Record<string, SchemaReducer<string, string, string>>,
    flowData: FlowData | undefined
): UseFlowReducer {
    const descriptorRef = useRef(descriptor);

    // Internal State Machine State
    type BaseState = {
        type: 'idle' | 'done' | 'loading';
        flowState: FlowState | undefined;
        loadingID?: string;
    };

    type LoadingState = BaseState & {
        loadingID: string;
    };

    type State = BaseState|LoadingState;

    const [state, dispatch] = useReducer<State, undefined, [Transition]>(
        (state, transition) => {
            console.log(transition);
            switch (transition.type) {
                case 'override':
                    return {
                        type: 'idle',
                        flowState: transition.flowState,
                    };
                case 'load':
                    if (state.type === 'idle')
                        return {
                            type: 'loading',
                            flowState: state.flowState,
                            loadingID: transition.loadingID,
                        };
                    break;
                case 'resolve':
                    if (state.type === 'loading' && state.loadingID == transition.loadingID) {
                        if (transition.stepState === null)
                            return {
                                type: 'done',
                                flowState: state.flowState
                            };
                        return {
                            type: 'idle',
                            flowState: {
                                stepIndex: state.flowState !== undefined 
                                    ? state.flowState.stepIndex + 1
                                    : 0,
                                stepState: transition.stepState,
                                transaction: transition.transaction ?? state.flowState?.transaction,
                                data: { ...state.flowState?.data, ...transition.data }
                            },
                            loadingID: transition.loadingID,
                        };
                    }
                    break;
            }
            return state;
        },
        undefined,
        () => ({
            type: 'idle',
            flowState: flowData !== undefined
                // FIXME: this initial setup depdends on server-computed state (`data`)
                ? createFlowState(
                    descriptorRef,
                    flowData,
                    t => dispatch(t)
                )
                : undefined
        }),
    );

    const flow = useMemo(() =>
        (state.flowState !== undefined && flowData !== undefined) ? {
            done: state.type === 'done',
            loading: state.type === 'loading',
            state: state.flowState,
            continueTo: flowData.continueTo
        } : undefined,
        [state, flowData?.continueTo]
    );

    useEffect(() => {
        if (!flowData) {
            dispatch({ type: 'override', flowState: undefined });
            return;
        }
        if (!isValidFlowStep(descriptor, flowData.flowStep)) {
            dispatch({ type: 'override', flowState: undefined });
            return;
        }
        if (flow === undefined || !isFlowDataEq(flowData, toFlowData(flow))) {
            dispatch({
                type: 'override',
                flowState: createFlowState(
                    descriptorRef,
                    flowData,
                    t => dispatch(t),
                    flow?.state.data
                )
            });
        }
    }, [flowData]);

    useEffect(() => {
        if (flowData === undefined) return;
        if (!isValidFlowStep(descriptor, flowData.flowStep))
            dispatch({ type: 'override', flowState: undefined });
        descriptorRef.current = descriptor;
    }, [descriptor]);

    return [
        flow,
        dispatch,
    ];
}

function newID(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';

    for (let i = 0; i < length; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }

    return id;
}

function createStepState(
    descriptorRef: RefObject<Record<string, SchemaReducer<string, string, string>>>,
    dispatch: (transition: Transition) => void,
    step: string,
    errors?: Partial<Record<string, SubmitError>> | undefined
): ErasedFlowStepState {
    async function erasedReducer(
        thisState: ErasedFlowStepState,
        data: Record<string, string>,
    ): Promise<ResolveResult> {
        const erasedDescriptor = descriptorRef.current as Record<
            string,
            SchemaReducer<string, string, string>
        >;
        const result = await erasedDescriptor[thisState.step]({ state: thisState, data });
        if (result === null)
            return {
                stepState: null,
                transaction: undefined,
                data: {}
            };
        const { step, errors, transaction } = result;
        
        const stepState = createStepState(descriptorRef, dispatch, step, errors);
        return { stepState, transaction, data };
    }

    async function executeReduceUpdate(thisState: ErasedFlowStepState, data: Record<string, string>) {
        const loadingID = newID();
        dispatch({ type: 'load', loadingID });
        const result = await erasedReducer(thisState, data);
        dispatch({ type: 'resolve', loadingID, ...result });
    }

    const stepState = {
        step,
        errors: errors ?? {},
        update(data) {
            executeReduceUpdate(this, data);
        },
    } satisfies ErasedFlowStepState;
    stepState.update = stepState.update.bind(stepState);
    return Object.freeze(stepState);
}

export function useCreateFlow<TStates extends FlowStepState<string, any>>(
    descriptor: FlowDescriptor<TStates>,
): [Flow, TStates] | [undefined, undefined] {
    const location = useLocation();
    const navigate = useNavigate();

    const flowData = useMemo(() => parseFlowData(location), [location]);

    const [flow] = useFlowReducer(descriptor, flowData);

    useEffect(() => {
        if (flow === undefined) return;
        const parsedFlowData = parseFlowData(location);
        if (parsedFlowData === undefined) return;
    
        const flowData = toFlowData(flow);

        if (!isFlowDataEq(flowData, parsedFlowData))
            navigate({
                search: serializeFlowDataToURLParams(flowData)
            });
    }, [flow?.state.stepState.step]);

    useEffect(() => {
        if (flow?.done)
            window.location.assign(flow.continueTo);
    }, [flow?.done]);

    return flow !== undefined
        ? [flow, flow.state.stepState as TStates]
        : [undefined, undefined];
}

export function Flow({ flow, children }: { flow: Flow; children: ReactNode; }) {
    return (
        <FlowContextObj value={flow}>
            {children}
        </FlowContextObj>
    );
}
