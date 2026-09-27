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
type FlowState<F extends FormKind> = {
    transactionToken: string | undefined;
    loading: boolean;
    form: F;
    args: FormArgsOf<F>;
    errors: FormErrorsOf<F>;
};

export type Reducer<F extends FormKind, G extends FormKind> = (
    current: Readonly<FlowState<F>>,
    formData: FormDataOf<F>,
) => FlowState<F> | FlowState<G>|null;

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
    reducers: Partial<Record<FormKind, Reducer<FormKind, FormKind>>>,
) {
    async function reduceStep(
        current: Readonly<FlowState<FormKind>>,
        data: FormDataOf<FormKind>,
    ): Promise<FlowState<FormKind>|null> {
        await new Promise(resolve => setTimeout(resolve, 500));
        const newState = reducers[current.form]?.(current, data) ?? current;
        // TODO: reduce internal state (flowStep) as well.
        return newState;
    }

    return () => {
        const [reducerState, setReducerState] = useState<FlowState<FormKind>|null>(initial);

        const dispatch = useCallback(
            async (data: FormDataOf<any>) => {
                if (reducerState === null)
                    return;
                setReducerState({
                    ...reducerState,
                    loading: true,
                });
                const x = await reduceStep(
                    reducerState as FlowState<FormKind>,
                    data as FormDataOf<FormKind>,
                );
                setReducerState(x);
            },
            [reducerState],
        );

        return (
            <>
                {reducerState &&
                    forms[reducerState.form].renderForm(reducerState.args as FormArgsOf<FormKind>, {
                        loading: reducerState.loading,
                        errors: reducerState.errors as FormErrorsOf<FormKind>,
                        onDataSubmit: dispatch,
                    })}
            </>
        );
    };
}

export function flow<I extends FormKind, TFormKinds extends FormKind>(
    _name: string,
    initial: FlowState<I>,
    reducers: { [P in TFormKinds | I]: Reducer<P, TFormKinds> },
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
        loading: false,
    },
    {
        identify: (current, data) => {
            if (data.email === 'test@email.com')
                return {
                    transactionToken: current.transactionToken,
                    form: 'identify',
                    args: {},
                    errors: { email: 'invalid-email' },
                    loading: false,
                };

            return {
                transactionToken: current.transactionToken,
                form: 'email-otp',
                args: { email: data.email },
                errors: { },
                loading: false,
            };
        },
        'email-otp': (current, data) => {
            if (data.code === '12345678')
                return {
                    transactionToken: current.transactionToken,
                    form: 'email-otp',
                    args: { email: current.args.email },
                    errors: { code: 'invalid-code' },
                    loading: false
                };
            return null;
        },
    },
);
