import { StyledLink } from 'quipt/components/link';
import { EmailForm } from './email-form';
import { AppCodeForm } from './code-form';
import { EmailCodeForm } from './email-code-form';
import { PasswordForm } from './password-form';
import { FlowProvider, defineFlow, useCreateFlow } from './flow';
import { FlowContainer } from './flow-container';
import { useAuthService } from '../schemas';

import type { ComponentType } from "react";

type Without<T, K extends keyof any> = Omit<T, K>;

function withProps<P extends object, Injected extends Partial<P>>(
    Component: ComponentType<P>,
    injectedProps: Injected,
): ComponentType<Without<P, keyof Injected>> {
    return (props) => <Component {...props as P} {...injectedProps}/>;
}

defineFlow({
    name: 'signin',
    handlers() {
        const authService = useAuthService();
        return {
            identify: authService.identify.bind(authService),
            'app-otp': authService.appOtp.bind(authService),
            'email-otp': authService.emailOtp.bind(authService),
            password: authService.password.bind(authService),
        };
    },
    headings: {
        identify: 'Anmelden',
        'app-otp': 'Identität bestätigen',
        'email-otp': 'Identität bestätigen',
        password: 'Identität bestätigen',
    },
    components: {
        identify: withProps(EmailForm, { helpInfo: 'Bei Ihrem Quipt Konto anmelden.' }),
        'email-otp': EmailCodeForm,
        'app-otp': AppCodeForm,
        password: PasswordForm,
    },
});

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
        <FlowProvider
            flow={flow}
            renderNavContent={flow =>
                flow.state.stepIndex === 0 ? (
                    <StyledLink to="/auth/signup?continue=http%3A%2F%2Flocalhost%3A5173%2Fapp&step=collect-email&index=0">
                        Konto erstellen
                    </StyledLink>
                ) : undefined
            }>
            <title>Anmelden - Quipt</title>
            <FlowContainer>
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
                        errors={errors}
                        onDataSubmit={update}
                    />
                )}
                {step === 'app-otp' && (
                    <AppCodeForm
                        heading="Identität bestätigen"
                        errors={errors}
                        onDataSubmit={update}
                    />
                )}
                {step === 'password' && (
                    <PasswordForm
                        heading="Identität bestätigen"
                        errors={errors}
                        onDataSubmit={update}
                    />
                )}
            </FlowContainer>
        </FlowProvider>
    );
}
