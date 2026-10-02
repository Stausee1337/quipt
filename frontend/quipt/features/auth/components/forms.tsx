import { CodeForm } from './code-form';
import { EmailForm } from './email-form';
import { EmailCodeForm } from './email-code-form';
import { PasswordForm as PasswordBaseForm } from './password-form';

// identify
export function IdentifyForm({ errors }) {
    const service = useAuthService();

    return (
        <EmailForm
            heading="Amnelden"
            helpInfo="Bei Ihrem Quipt Konto anmelden."
            onDataSubmit={useFlowSubmit(service.identify)}
            errors={errors}
        />
    );
}

// email-otp
export function EmailOtpForm({ errors }) {
    const service = useAuthService();

    return (
        <EmailCodeForm
            heading="Identität bestätigen"
            onDataSubmit={useFlowSubmit(service.emailOtp)}
            errors={errors}
        />
    );
}
//
// app-otp
export function AppOtpForm({ errors }) {
    const service = useAuthService();

    return (
        <CodeForm
            codeLength={6}
            heading="Identität bestätigen"
            helpInfo="Bitte geben Sie den Code aus Ihrer Zwei-Faktor-Authentisierungsapp ein."
            onDataSubmit={useFlowSubmit(service.appOtp)}
            errors={errors}
        />
    );
}

// password
export function PasswordForm({ errors }) {
    const service = useAuthService();

    return (
        <PasswordBaseForm
            heading="Identität bestätigen"
            helpInfo="Bitte geben Sie Ihr Passwort ein."
            onDataSubmit={useFlowSubmit(service.password)}
            errors={errors}
        />
    );
}
