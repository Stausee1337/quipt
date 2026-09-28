import type { SubmitError } from './components/form';

export type FlowState<TStep extends string, TErrors extends Record<string, SubmitError> = {}> = {
    transaction?: string | undefined;
    step: TStep;
    errors: Partial<TErrors>;
};

export type AuthService = {
    identify(input: {
        state: FlowState<'identify', any>;
        data: { email: string; };
    }): Promise<
        | FlowState<'identify', { email: 'invalid-email' | 'email-not-found' }>
        | FlowState<'app-otp'>
        | FlowState<'email-otp'>
        | FlowState<'password'>>;
    appOtp(input: {
        state: FlowState<'app-otp', any>;
        data: { code: string; };
    }): Promise<FlowState<'app-otp', { code: 'invalid-code' }> | null>;
    emailOtp(input: {
        state: FlowState<'email-otp', any>;
        data: { code: string; };
    }): Promise<FlowState<'email-otp', { code: 'invalid-code' }> | null>;
    password(input: {
        state: FlowState<'password', any>;
        data: { password: string; };
    }): Promise<FlowState<'password', { password: 'incorrect-password' }> | null>;
};

function delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
}

export function useAuthService(): AuthService {
    return {
        async identify({ state, data }) {
            await delay();
            if (data.email === 'test@email.com')
                return {
                    ...state,
                    errors: { email: 'email-not-found' }
                };
            return {
                ...state,
                step: 'email-otp',
                errors: {}
            };
        },
        async appOtp({ state }) {
            await delay();
            return {
                ...state,
                errors: {}
            };
        },
        async emailOtp({ state }) {
            await delay();
            return {
                ...state,
                errors: {}
            };
        },
        async password({ state }) {
            await delay();
            return {
                ...state,
                errors: {}
            };
        },
    }
}
