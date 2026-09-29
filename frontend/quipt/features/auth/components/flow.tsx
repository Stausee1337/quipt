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
    latentState: Record<string, unknown>;
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

type SerializedFlowData = {
    flowStep: string;
    flowStepIndex: number;
    transaction: string | undefined;
    continueTo: string | undefined;
};

type Flow = {
    loading: boolean;
    stepState: BaseFlowStepState
    step: number;
    transaction: string | undefined;
    continueTo: string | undefined;
};

const FlowContextObj = createContext<Flow | null>(null);

export function useFlow(): Flow {
    return useContext(FlowContextObj)!;
}

function parseFlowData(location: Location): SerializedFlowData | undefined {
    const params = new URLSearchParams(location.search);

    const step = params.get('step');
    if (step === null) return undefined;

    const indexString = params.get('index');
    if (indexString === null)
        return undefined;

    const index = parseInt(indexString);
    if (Number.isNaN(index)) return undefined;

    const transaction = params.get('t') ?? undefined;
    const continueTo = params.get('continue') ?? undefined;

    return {
        flowStep: step,
        flowStepIndex: index,
        transaction,
        continueTo,
    };
}

type ProtoFlow = {
    state: BaseFlowStepState;
    index: number;
    transaction: string | undefined;
    continueTo: string;
};

function getProtoFlow(location: Location): ProtoFlow | undefined {
    const data = parseFlowData(location);
    if (data === undefined) return undefined;
    return {
        state: {
            step: data.flowStep,
            latentState: {},
            errors: {},
        },
        index: data.flowStepIndex,
        transaction: data.transaction,
        // FIXME: validate continueTo on the server as not to have an open redirect
        continueTo: data.continueTo ?? 'https://quipt.app/app',
    };
}

function serializeFlowStepState(protoFlow: ProtoFlow, state: ErasedFlowStepState): string {
    const serializedFlowData = {
        flowStep: state.step,
        flowStepIndex: protoFlow.index,
        continueTo: protoFlow.continueTo,
        transaction: protoFlow.transaction,
    } satisfies SerializedFlowData;

    const params = new URLSearchParams();
    if (serializedFlowData.transaction !== undefined)
        params.append('t', serializedFlowData.transaction);

    if (serializedFlowData.continueTo !== undefined)
        params.append('continue', serializedFlowData.continueTo);

    params.append('step', serializedFlowData.flowStep);

    if (serializedFlowData.flowStepIndex !== undefined)
        params.append('index', String(serializedFlowData.flowStepIndex));

    return params.toString();
}

type FlowDescriptor<TStates extends FlowStepState<string, any>> = {
    [F in TStates as F['step']]: SchemaReducerOf<F, TStates['step']>;
};

function isValidFlowStepState<TStates extends FlowStepState<string, any>>(
    descriptor: FlowDescriptor<TStates>,
    state: BaseFlowStepState,
): boolean {
    return Object.keys(descriptor).includes(state.step);
}

type ErasedFlowStepState = BaseFlowStepState & {
    update(data: Record<string, string>): void;
};

type State =
    | {
          type: 'idle' | 'done';
          stepState: ErasedFlowStepState | undefined;
      }
    | {
          type: 'loading';
          stepState: ErasedFlowStepState | undefined;
          loadingID: string;
      };

type Transition<TState> =
    | {
          type: 'override';
          stepState: TState | undefined;
      }
    | {
          type: 'load';
          loadingID: string;
      }
    | {
          type: 'resolve';
          loadingID: string;
          stepState: TState | null;
      };

type UseFlowReducer<TState> = [
    {
        done: boolean;
        loading: boolean;
        stepState: TState | undefined;
    },
    Dispatch<Transition<TState>>
];

type UseErasedFlowReducer = UseFlowReducer<ErasedFlowStepState>;

function useErasedFlowReducer(
    initialState: () => ErasedFlowStepState | undefined,
): UseErasedFlowReducer {
    const [state, dispatcher] = useReducer<State, undefined, [Transition<ErasedFlowStepState>]>(
        (state, transition) => {
            console.log(state, transition);
            switch (transition.type) {
                case 'override':
                    return {
                        type: 'idle',
                        stepState: transition.stepState,
                    };
                case 'load':
                    if (state.type === 'idle')
                        return {
                            type: 'loading',
                            stepState: state.stepState,
                            loadingID: transition.loadingID,
                        };
                    break;
                case 'resolve':
                    if (state.type === 'loading' && state.loadingID == transition.loadingID) {
                        if (transition.stepState === null)
                            return {
                                type: 'done',
                                stepState: state.stepState
                            };
                        return {
                            type: 'idle',
                            stepState: transition.stepState,
                            loadingID: transition.loadingID,
                        };
                    }
                    break;
            }
            return state;
        },
        undefined,
        () => ({ type: 'idle', stepState: initialState() }),
    );

    return [
        {
            done: state.type === 'done',
            loading: state.type === 'loading',
            stepState: state.stepState,
        },
        dispatcher,
    ];
}

function useFlowReducer<TStates extends FlowStepState<string, any>>(
    initialState: () => TStates | undefined,
): UseFlowReducer<TStates> {
    const [state, dispatcher] = useErasedFlowReducer(initialState);
    return [
        {
            ...state,
            stepState: state.stepState as TStates | undefined
        },
        dispatcher,
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

function createNewState(
    descriptorRef: RefObject<Record<string, SchemaReducer<string, string, string>>>,
    dispatch: (transition: Transition<ErasedFlowStepState>) => void,
    protoState: BaseFlowStepState,
): ErasedFlowStepState {
    async function erasedReducer(
        thisState: ErasedFlowStepState,
        data: Record<string, string>,
    ): Promise<ErasedFlowStepState | null> {
        const erasedDescriptor = descriptorRef.current as Record<
            string,
            SchemaReducer<string, string, string>
        >;
        const result = await erasedDescriptor[thisState.step]({ state: thisState, data });
        return result === null
            ? null
            : createNewState(descriptorRef, dispatch, {
                  step: result.step,
                  errors: result.errors,
                  latentState: { ...thisState.latentState, ...data },
              });
    }

    async function executeReduceUpdate(thisState: ErasedFlowStepState, data: Record<string, string>) {
        const loadingID = newID();
        dispatch({ type: 'load', loadingID });
        const newState = await erasedReducer(thisState, data);
        dispatch({ type: 'resolve', loadingID, stepState: newState });
    }

    const flowState = {
        ...protoState,
        update(data) {
            executeReduceUpdate(this, data);
        },
    } satisfies ErasedFlowStepState;
    flowState.update = flowState.update.bind(flowState);
    return Object.freeze(flowState);
}

export function useCreateFlow<TStates extends FlowStepState<string, any>>(
    descriptor: FlowDescriptor<TStates>,
): [Flow, TStates] | [undefined, undefined] {
    const location = useLocation();
    const navigate = useNavigate();

    const descriptorRef = useRef(descriptor);
    const protoFlow = useMemo(() => getProtoFlow(location), []);

    const [state, dispatch] = useFlowReducer(() => {
        if (protoFlow?.state === undefined) return undefined;
        if (!isValidFlowStepState(descriptor, protoFlow.state)) return undefined;
        return createNewState(
            descriptorRef,
            transition => dispatch(transition as Transition<TStates>),
            protoFlow.state,
        ) as TStates;
    });

    useEffect(() => {
        if (protoFlow?.state === undefined) return;
        if (!isValidFlowStepState(descriptor, protoFlow.state))
            dispatch({ type: 'override', stepState: undefined });
        descriptorRef.current = descriptor;
    }, [descriptor]);

    useEffect(() => {
        protoFlow && state.stepState && navigate({
            search: serializeFlowStepState(protoFlow, state.stepState)
        });
    }, [state.stepState?.step]);

    useEffect(() => {
        if (protoFlow !== undefined && state.done)
            window.location.assign(protoFlow.continueTo);
    }, [state.done]);

    return (protoFlow !== undefined && state.stepState !== undefined) ? [
        {
            step: protoFlow.index,
            stepState: state.stepState,
            transaction: protoFlow.transaction,
            continueTo: protoFlow.continueTo,
            loading: state.loading,
        },
        state.stepState,
    ] : [undefined, undefined];
}

export function Flow({ flow, children }: { flow: Flow; children: ReactNode; }) {
    return (
        <FlowContextObj value={flow}>
            {children}
        </FlowContextObj>
    );
}
