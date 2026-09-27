import { type JSX, useState, useCallback } from 'react';

import {
    type FormKind,
    type FormArgsOf,
    type FormDataOf,
    type FormErrorsOf,
    forms,
} from './components/forms';

// flowStep: number;
// flowName: string;
// continueTo: string;
type FlowStateBase<F extends FormKind | null> = {
    transactionToken: string | undefined;
    form: F;
};

export type FlowState<F extends FormKind | null> = FlowStateBase<F> &
    (F extends FormKind
        ? { args: FormArgsOf<F>; errors: FormErrorsOf<F> }
        : { args?: undefined; errors?: undefined });

export type Reducer<F extends FormKind, G extends FormKind | null> = (
    current: Readonly<FlowState<F>>,
    formData: FormDataOf<F>,
) => FlowState<F> | FlowState<G>;

// type FlowData = {
//     transactionToken: string | undefined;
//     flowName: string;
//     flowStep: string | undefined;
//     form: string;
//     continueTo: string | undefined;
// };
// declare function useFlowData(): FlowData;
//
// function useFlowReducer(_flowData: FlowData): [] {
//     // useReducer();
//     console.log(useReducer);
//     return [];
// }

export function FlowManager(): JSX.Element {
    // ReducerState + FlowState
    // const flowData = useFlowData();

    // const [] = useFlowReducer(flowData);
    // https://quipt.app/auth/identify?continue=https://quipt.app/app&flow=signin
    // -> Flow
    return testFlow();
}

export type Flow = () => JSX.Element;

export function _flowErased(
    initial: FlowState<FormKind>,
    reducers: Partial<Record<FormKind, Reducer<FormKind, FormKind | null>>>,
) {
    async function reduceStep(
        current: Readonly<FlowState<FormKind>>,
        data: FormDataOf<FormKind>,
    ): Promise<FlowState<FormKind | null>> {
        await new Promise(resolve => setTimeout(resolve, 100));
        const newState = reducers[current.form]?.(current, data) ?? current;
        // TODO: reduce internal state (flowStep) as well.
        return newState;
    }

    return () => {
        console.log('rerender flow');
        const [reducerState, setReducerState] = useState<FlowState<FormKind | null>>(initial);

        const dispatch = useCallback(
            async (data: FormDataOf<any>) => {
                const x = await reduceStep(reducerState as FlowState<FormKind>, data as FormDataOf<FormKind>);
                setReducerState(x);
            },
            [reducerState],
        );

        return (
            <>
                {reducerState.form &&
                    forms[reducerState.form].renderForm(
                        reducerState.args as FormArgsOf<FormKind>,
                        reducerState.errors as FormErrorsOf<FormKind>,
                        dispatch,
                    )}
            </>
        );
    };
}

export function flow<I extends FormKind, TFormKinds extends FormKind>(
    _name: string,
    initial: FlowState<I>,
    reducers: { [P in TFormKinds | I]: Reducer<P, TFormKinds | null> },
): Flow {
    return _flowErased(initial, reducers);
}

const testFlow = flow(
    'signin',
    {
        transactionToken: undefined,
        form: 'identify',
        args: {},
        errors: {},
    },
    {
        identify: (current, data) => {
            if (data.email === 'test@email.com')
                return {
                    transactionToken: current.transactionToken,
                    form: 'identify',
                    args: {},
                    errors: { email: 'invalid-email' },
                };

            return {
                transactionToken: current.transactionToken,
                form: 'email-otp',
                args: { email: data.email },
                errors: { code: 'invalid-code' },
            };
        },
        'email-otp': (current, _data) => {
            if (Math.floor(Math.random() * 10000) % 2 === 0) return current;
            return {
                transactionToken: current.transactionToken,
                form: null,
            };
        },
    },
);
