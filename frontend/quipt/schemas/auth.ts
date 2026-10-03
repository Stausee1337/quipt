type CodeError = 'invalid-code';
type EmailError = 'email-not-found' | 'email-already-used' | 'invalid-email';
type NameError = 'invalid-name';
type PasswordError = 'incorrect-password';

export type SubmitError = CodeError | EmailError | NameError | PasswordError;

const errorMessages = {
    'invalid-code': 'Ungültiger Code',
    'email-not-found': 'Kein Konto zu dieser E-Mail gefunden',
    'email-already-used': 'Es gibt bereits ein Konto zu dieser E-Mail',
    'invalid-email': 'Ungültige E-Mail',
    'invalid-name': 'Ungültiger Name',
    'incorrect-password': 'Falsches Passwort',
} satisfies { [P in SubmitError]: string };

export function mapErrorToMessage(error: SubmitError): string {
    return errorMessages[error];
}

export function mapErrorsToMessages<TKeys extends string>(
    errors: Partial<Record<TKeys, SubmitError>>,
): Record<TKeys, string> {
    return Object.fromEntries(
        (
            (Object.entries(errors) as [TKeys, SubmitError | undefined][]).filter(
                ([_, value]) => value !== undefined,
            ) as [TKeys, SubmitError][]
        ).map(([key, value]) => [key, mapErrorToMessage(value)]),
    ) as any;
}

type BaseFlowState = {
    transaction?: string | undefined;
};

type FlowState<
    TStep extends string,
    TErrors extends Record<string, SubmitError> = {},
> = BaseFlowState & {
    step: TStep;
    errors: Partial<TErrors>;
};

export type AuthService = {
    identify(input: {
        state: BaseFlowState;
        data: { email: string };
    }): Promise<
        | FlowState<'identify', { email: 'invalid-email' | 'email-not-found' }>
        | FlowState<'app-otp'>
        | FlowState<'email-otp'>
        | FlowState<'password'>
    >;
    appOtp(input: {
        state: BaseFlowState;
        data: { code: string };
    }): Promise<FlowState<'app-otp', { code: 'invalid-code' }> | null>;
    emailOtp(input: {
        state: BaseFlowState;
        data: { code: string };
    }): Promise<FlowState<'email-otp', { code: 'invalid-code' }> | null>;
    password(input: {
        state: BaseFlowState;
        data: { password: string };
    }): Promise<FlowState<'password', { password: 'incorrect-password' }> | null>;

    collectEmail(input: {
        state: BaseFlowState;
        data: { email: string };
    }): Promise<
        | FlowState<'collect-email', { email: 'invalid-email' | 'email-already-used' }>
        | FlowState<'verify-email'>
    >;
    verifyEmail(input: {
        state: BaseFlowState;
        data: { code: string };
    }): Promise<FlowState<'verify-email', { code: 'invalid-code' }> | FlowState<'name'>>;
    name(input: {
        state: BaseFlowState;
        data: { name: string };
    }): Promise<FlowState<'name', { name: 'invalid-name' }> | null>;
};

function delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
}

function newTransaction(): string {
    const source = new Uint8Array(24);
    window.crypto.getRandomValues(source);
    return source.toBase64({ alphabet: 'base64url', omitPadding: true });
}

export function useAuthService(): AuthService {
    return {
        async collectEmail({ state }) {
            return {
                ...state,
                step: 'verify-email',
                errors: {},
            };
        },
        async verifyEmail({ state }) {
            return {
                ...state,
                step: 'name',
                errors: {},
            };
        },
        async name() {
            return null;
        },
        async identify({ state, data }) {
            await delay();
            if (data.email === 'test@email.com')
                return {
                    ...state,
                    step: 'identify',
                    errors: { email: 'email-not-found' },
                };

            return {
                ...state,
                step: 'email-otp',
                transaction: newTransaction(),
                errors: {},
            };
        },
        async appOtp({ state }) {
            await delay();
            return {
                ...state,
                step: 'app-otp',
                errors: {},
            };
        },
        async emailOtp({ state, data }) {
            await delay();
            if (data.code === '29092026') return null;
            return {
                ...state,
                step: 'email-otp',
                errors: { code: 'invalid-code' },
            };
        },
        async password({ state }) {
            await delay();
            return {
                ...state,
                step: 'password',
                errors: {},
            };
        },
    };
}
