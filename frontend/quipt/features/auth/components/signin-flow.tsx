import type { FormKeysOf } from './form';
import { EmailForm } from './email-form';
import { CodeForm } from './code-form';
import { EmailCodeForm } from './email-code-form';
import { PasswordForm } from './password-form';
import { Flow, type FlowState, useCreateFlow } from './flow';
import { useAuthService } from '../schemas';

type IdentifyState = FlowState<
    'identify',
    FormKeysOf<typeof EmailForm>
>;
type AppOtpState = FlowState<'app-otp', FormKeysOf<typeof CodeForm>>;
type EmailOtpState = FlowState<
    'email-otp',
    FormKeysOf<typeof EmailCodeForm>>;
type PasswordState = FlowState<'password', FormKeysOf<typeof PasswordForm>>;
type SigninStates = IdentifyState | AppOtpState | EmailOtpState | PasswordState;

export function SigninFlow() {
    const authService = useAuthService();

    const [flow, flowState] = useCreateFlow<SigninStates>({
        identify: authService.identify,
        'app-otp': authService.appOtp,
        'email-otp': authService.emailOtp,
        password: authService.password
    });

    if (flowState === undefined)
        return <></>;

    const { latentState, errors, update, step } = flowState;

    return (
        <Flow flow={flow}>
            {step === 'identify' && (
                <EmailForm
                    heading="Amnelden"
                    helpInfo="Bei Ihrem Quipt Konto anmelden."
                    errors={errors}
                    onDataSubmit={update}
                />
            )}
            {step === 'email-otp' && (
                <EmailCodeForm
                    heading="Identität bestätigen"
                    email={typeof latentState?.email === 'string' ? latentState.email : undefined}
                    errors={errors}
                    onDataSubmit={update}
                />
            )}
            {step === 'app-otp' && (
                <CodeForm
                    codeLength={6}
                    heading="Identität bestätigen"
                    helpInfo="Bitte geben Sie den Code aus Ihrer Zwei-Faktor-Authentisierungsapp ein."
                    errors={errors}
                    onDataSubmit={update}
                />
            )}
            {step === 'password' && (
                <PasswordForm
                    heading="Identität bestätigen"
                    helpInfo="Bitte geben Sie Ihr Passwort ein."
                    errors={errors}
                    onDataSubmit={update}
                />
            )}
        </Flow>
    );
}

