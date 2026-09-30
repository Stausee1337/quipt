import {
    type ComponentType,
    type Dispatch,
    type ReactNode,
    type RefObject,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
} from 'react';

import { type Location, useLocation, useNavigate } from 'react-router';

import type { SubmitError } from '../schemas';
import type { NavRenderFunction } from './form';

export interface BaseFlowStepState {
    step: string;
    errors: Partial<Record<string, SubmitError>>;
}

export interface FlowStepState<
    TStep extends string,
    TKeys extends string,
> extends BaseFlowStepState {
    step: TStep;
    errors: Partial<Record<TKeys, SubmitError>>;
    update(data: Record<TKeys, string>): void;
}

type ErasedFlowStepState = BaseFlowStepState & {
    update(data: Record<string, string>): void;
};

type FlowStepStateFor<
    TStep extends string,
    TData extends Record<string, Record<string, string>>,
> = TStep extends string ? FlowStepState<TStep, keyof TData[TStep] & string> : never;

type FlowStepStateOf<TData extends Record<string, Record<string, string>>> = FlowStepStateFor<
    keyof TData & string,
    TData
>;

type SchemaHandler<
    TData extends Record<string, string>,
    TOut extends string,
> = (input: {
    state: {
        transaction?: string | undefined;
        errors: any;
    };
    data: TData;
}) => Promise<
    | {
          transaction?: string | undefined;
          step: TOut;
          errors: Partial<Record<keyof TData & string, SubmitError>>;
      }
    // | {
    //       transaction?: string | undefined;
    //       step: TOut;
    //       errors: {};
    //   }
    | null
>;

type ErasedSchemaHandler = SchemaHandler<Record<string, string>, string>;

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

const FlowContextObj = createContext<FlowContext | null>(null);

type FlowContext = {
    flow: Flow;
    renderNavContent: NavRenderFunction | undefined;
};

export function useFlow(): Flow {
    return useContext(FlowContextObj)!.flow;
}

export function INTERNAL_useFlowContext(): FlowContext {
    return useContext(FlowContextObj)!;
}

function parseFlowData(location: Location): FlowData | undefined {
    const params = new URLSearchParams(location.search);

    const step = params.get('step');
    if (step === null) return undefined;

    const indexString = params.get('index');
    if (indexString === null) return undefined;

    const index = parseInt(indexString);
    if (Number.isNaN(index)) return undefined;

    const transaction = params.get('t') ?? undefined;
    const continueTo = params.get('continue');
    if (continueTo === null) return undefined;

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
    return (
        a.flowStep === b.flowStep &&
        a.flowStepIndex === b.flowStepIndex &&
        a.transaction === b.transaction &&
        a.continueTo === b.continueTo
    );
}

function serializeFlowDataToURLParams(flowData: FlowData): string {
    const params = new URLSearchParams();
    if (flowData.transaction !== undefined) params.append('t', flowData.transaction);

    if (flowData.continueTo !== undefined) params.append('continue', flowData.continueTo);

    params.append('step', flowData.flowStep);

    if (flowData.flowStepIndex !== undefined)
        params.append('index', String(flowData.flowStepIndex));

    return params.toString();
}

function isValidFlowStep(handlers: Record<string, ErasedSchemaHandler>, step: string): boolean {
    return Object.keys(handlers).includes(step);
}

type ResolveResult = {
    stepState: ErasedFlowStepState | null;
    transaction: string | undefined;
    data: Record<string, string>;
};

type ResolveTransition = ResolveResult & {
    type: 'resolve';
    loadingID: string;
};

type Transition =
    | {
          type: 'override';
          flowState: FlowState | undefined;
      }
    | {
          type: 'load';
          loadingID: string;
      }
    | ResolveTransition;

type BaseMachineState = {
    type: 'idle' | 'done' | 'loading';
    flowState: FlowState | undefined;
    loadingID?: string;
};

type LoadingMachineState = BaseMachineState & {
    loadingID: string;
};

type MachineState = BaseMachineState | LoadingMachineState;

function machineReducer(state: MachineState, transition: Transition): MachineState {
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
                        flowState: state.flowState,
                    };
                return {
                    type: 'idle',
                    flowState: {
                        stepIndex:
                            state.flowState !== undefined ? state.flowState.stepIndex + 1 : 0,
                        stepState: transition.stepState,
                        transaction: transition.transaction ?? state.flowState?.transaction,
                        data: { ...state.flowState?.data, ...transition.data },
                    },
                    loadingID: transition.loadingID,
                };
            }
            break;
    }
    return state;
}

function useFlowReducer(
    handlers: Record<string, ErasedSchemaHandler>,
    flowData: FlowData | undefined,
): Flow | undefined {
    const handlersRef = useRef(handlers);

    const [state, dispatch] = useReducer<MachineState, undefined, [Transition]>(
        machineReducer,
        undefined,
        () => ({
            type: 'idle',
            flowState:
                flowData !== undefined
                    ? // FIXME: this initial setup depdends on server-computed state (`data`)
                      createFlowState(handlersRef, flowData, t => dispatch(t))
                    : undefined,
        }),
    );

    const flow = useMemo(
        () =>
            state.flowState !== undefined && flowData !== undefined
                ? {
                      done: state.type === 'done',
                      loading: state.type === 'loading',
                      state: state.flowState,
                      continueTo: flowData.continueTo,
                  }
                : undefined,
        [state, flowData?.continueTo],
    );

    useEffect(() => {
        if (!flowData) {
            dispatch({ type: 'override', flowState: undefined });
            return;
        }
        if (!isValidFlowStep(handlers, flowData.flowStep)) {
            dispatch({ type: 'override', flowState: undefined });
            return;
        }
        if (flow === undefined || !isFlowDataEq(flowData, toFlowData(flow))) {
            dispatch({
                type: 'override',
                flowState: createFlowState(
                    handlersRef,
                    flowData,
                    t => dispatch(t),
                    flow?.state.data,
                ),
            });
        }
    }, [flowData]);

    useEffect(() => {
        if (flowData === undefined) return;
        if (!isValidFlowStep(handlers, flowData.flowStep))
            dispatch({ type: 'override', flowState: undefined });
        handlersRef.current = handlers;
    }, [handlers]);

    return flow;
}

function createFlowState(
    handlersRef: RefObject<Record<string, ErasedSchemaHandler>>,
    flowData: FlowData,
    disptach: Dispatch<Transition>,
    data?: Record<string, string> | undefined,
): FlowState {
    return {
        stepState: createStepState(handlersRef, disptach, flowData.flowStep),
        stepIndex: flowData.flowStepIndex,
        transaction: flowData.transaction,
        data: data ?? {},
    };
}

function createStepState(
    handlersRef: RefObject<Record<string, ErasedSchemaHandler>>,
    dispatch: (transition: Transition) => void,
    step: string,
    errors?: Partial<Record<string, SubmitError>> | undefined,
): ErasedFlowStepState {
    async function erasedHandlerWrapper(
        thisState: ErasedFlowStepState,
        data: Record<string, string>,
    ): Promise<ResolveResult> {
        const result = await handlersRef.current[thisState.step]({ state: thisState, data });
        if (result === null)
            return {
                stepState: null,
                transaction: undefined,
                data: {},
            };
        const { step, errors, transaction } = result;

        const stepState = createStepState(handlersRef, dispatch, step, errors);
        return { stepState, transaction, data };
    }

    async function updateFlowCallHandler(
        thisState: ErasedFlowStepState,
        data: Record<string, string>,
    ) {
        const loadingID = newID();
        dispatch({ type: 'load', loadingID });
        const result = await erasedHandlerWrapper(thisState, data);
        dispatch({ type: 'resolve', loadingID, ...result });
    }

    const stepState = {
        step,
        errors: errors ?? {},
        update(data) {
            updateFlowCallHandler(this, data);
        },
    } satisfies ErasedFlowStepState;
    stepState.update = stepState.update.bind(stepState);
    return Object.freeze(stepState);
}

function newID(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';

    for (let i = 0; i < length; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }

    return id;
}

type HandlerMap<TData extends Record<string, Record<string, string>>> = {
    [TStep in keyof TData & string]: SchemaHandler<TData[TStep], keyof TData & string>;
};

// HACK: using `keyof` can destroy inference from some reason
type KeyOf<TData extends Record<string, Record<string, string>>> = 
    TData extends Record<infer TKey, Record<string, string>>
    ? TKey
    : never;

type FlowStepProps<TKeys extends string> = {
    heading: string;
    errors: Partial<Record<TKeys, SubmitError>>;
    onDataSubmit?: (data: Record<TKeys, string>) => void;
}

type FlowStepComponents<TData extends Record<string, Record<string, string>>> = {
    [TStep in KeyOf<TData>]?: ComponentType<FlowStepProps<keyof TData[TStep] & string>>
};

// TODO: A flow actually needs to have invariants in order to be a safe, checked flow:
// FLOW INDPENDENT:
//  - `index` is required URL param 
//  - `step` is required URL param 
//  - `continue` is required URL param 
//  - the `continue` URL needs to stay within origin (e.g. quipt.app)
//  - if it has one, the `transaction` needs to be valid (speical 24byte binary string base64url encoded, no padding + present in redis)
//    - the server provides for the `data` associated with the flow
// FLOW DPENDENT:
//  - some flows require the user to be signed in, others require the user to be signed out 
// ALSO IMPORTANT:
//  - flows that have no initial data (e.g. signin/signup) can be created fully by the client
//  - flows that require initial data (e.g. an email for display) need to be crated by the server (e.g. password reset, login method change, etc)
// -> we'll need to put this on the flow somewhere (probably ther'll also be a loader)
export function defineFlow<TData extends Record<string, Record<string, string>>>(descriptor: {
    name: string;
    handlers: HandlerMap<TData> | (() => HandlerMap<TData>);
    headings: Record<KeyOf<TData>, string>,
    components: FlowStepComponents<TData>;
}): void {}

export function useCreateFlow<TData extends Record<string, Record<string, string>>>(
    handlers: HandlerMap<TData>,
): [Flow, FlowStepStateOf<TData>] | [undefined, undefined] {
    const location = useLocation();
    const navigate = useNavigate();

    const flowData = useMemo(() => parseFlowData(location), [location]);

    const flow = useFlowReducer(
        handlers as unknown as Record<string, ErasedSchemaHandler>,
        flowData,
    );

    useEffect(() => {
        if (flow === undefined) return;
        const parsedFlowData = parseFlowData(location);
        if (parsedFlowData === undefined) return;

        const flowData = toFlowData(flow);

        if (!isFlowDataEq(flowData, parsedFlowData))
            navigate({
                search: serializeFlowDataToURLParams(flowData),
            });
    }, [flow?.state.stepState.step]);

    useEffect(() => {
        if (flow?.done) window.location.assign(flow.continueTo);
    }, [flow?.done]);

    return flow !== undefined
        ? [flow, flow.state.stepState as FlowStepStateOf<TData>]
        : [undefined, undefined];
}

export function FlowProvider({
    flow,
    children,
    renderNavContent,
}: {
    flow: Flow;
    children: ReactNode;
    renderNavContent?: NavRenderFunction;
}) {
    return <FlowContextObj value={{ flow, renderNavContent }}>{children}</FlowContextObj>;
}
