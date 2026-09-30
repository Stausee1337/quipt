import { EmailForm } from './email-form';
import { CodeForm } from './code-form';
import { EmailCodeForm } from './email-code-form';
import { PasswordForm } from './password-form';
import { Flow, useCreateFlow } from './flow';
import { useAuthService } from '../schemas';
import { FlowContainer } from './flow-container';
import { StyledLink } from 'quipt/components/link';

export function SigninFlow() {
    const authService = useAuthService();

    const [flow, stepState] = useCreateFlow({
        identify: authService.identify,
        'app-otp': authService.appOtp,
        'email-otp': authService.emailOtp,
        password: authService.password,
    });

    if (stepState === undefined) return <></>;


    const { errors, update, step } = stepState;

    return (
        <Flow
            flow={flow}
            renderNavContent={flow => flow.state.stepIndex === 0 ? (
                <StyledLink to="/auth/signup?continue=http%3A%2F%2Flocalhost%3A5173%2Fapp&step=collect-email&index=0">
                    Konto erstellen
                </StyledLink>
            ) : undefined}
        >
            <FlowContainer>
                {step === 'identify' && (
                    <EmailForm
                        heading="Amnelden"
                        helpInfo="Bei Ihrem Quipt Konto anmelden."
                        defaultValue={flow.state.data.email}
                        errors={errors}
                        onDataSubmit={update}
                    />
                )}
                {step === 'email-otp' && (
                    <EmailCodeForm
                        heading="Identität bestätigen"
                        email={flow.state.data.email}
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
            </FlowContainer>
        </Flow>
    );
}
