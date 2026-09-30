
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

export type FlowState<TStep extends string, TErrors extends Record<string, SubmitError> = {}> = {
    transaction?: string | undefined;
    step: TStep;
    errors: Partial<TErrors>;
};

export type AuthService = {
    identify(input: {
        state: FlowState<'identify', any>;
        data: { email: string };
    }): Promise<
        | FlowState<'identify', { email: 'invalid-email' | 'email-not-found' }>
        | FlowState<'app-otp'>
        | FlowState<'email-otp'>
        | FlowState<'password'>
    >;
    appOtp(input: {
        state: FlowState<'app-otp', any>;
        data: { code: string };
    }): Promise<FlowState<'app-otp', { code: 'invalid-code' }> | null>;
    emailOtp(input: {
        state: FlowState<'email-otp', any>;
        data: { code: string };
    }): Promise<FlowState<'email-otp', { code: 'invalid-code' }> | null>;
    password(input: {
        state: FlowState<'password', any>;
        data: { password: string };
    }): Promise<FlowState<'password', { password: 'incorrect-password' }> | null>;
};

function delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
}

export function useAuthService(): AuthService {
    return {
        async identify({ state, data }) {
            console.log('server hit');
            await delay();
            if (data.email === 'test@email.com')
                return {
                    ...state,
                    errors: { email: 'email-not-found' },
                };
            
            const source = new Uint8Array(24);
            window.crypto.getRandomValues(source);
            const transaction = source.toBase64({ alphabet: 'base64url', omitPadding: true });
            return {
                ...state,
                step: 'email-otp',
                transaction,
                errors: {},
            };
        },
        async appOtp({ state }) {
            await delay();
            return {
                ...state,
                errors: {},
            };
        },
        async emailOtp({ state, data }) {
            await delay();
            if (data.code === '29092026')
                return null;
            return {
                ...state,
                errors: {},
            };
        },
        async password({ state }) {
            await delay();
            return {
                ...state,
                errors: {},
            };
        },
    };
}
