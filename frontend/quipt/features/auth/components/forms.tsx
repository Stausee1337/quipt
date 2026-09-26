import { type JSX } from 'react';

import { CodeForm } from './code-form';
import { EmailForm } from './email-form';
import { EmailCodeForm } from './email-code-form';
import { NameForm as NameFormBase } from './name-form';
import { PasswordForm as PasswordFormBase } from './password-form';

function onDataSubmit<T>(_data: T) {
    return new Promise<{}>(resolve => setTimeout(() => resolve({}), 1000));
}

// app-otp
export function AppOtpForm(): JSX.Element {
    return (
        <CodeForm
            codeLength={6}
            heading="Identität bestätigen"
            helpInfo="Bitte geben Sie den Code aus Ihrer Zwei-Faktor-Authentisierungsapp ein."
            onDataSubmit={onDataSubmit}
        />
    );
}

// collect-email
export function CollectEmailForm(): JSX.Element {
    return (
        <EmailForm
            heading="Quipt Konto erstellen"
            helpInfo="Bitte geben Sie Ihre E-Mail Addresse ein."
            onDataSubmit={onDataSubmit}
        />
    );
}

// email-otp
export function EmailOtpForm({ email }: { email: string }): JSX.Element {
    return (
        <EmailCodeForm
            email={email}
            heading="Identität bestätigen"
            onDataSubmit={onDataSubmit}
        />
    );
}

// identify
export function IdentifyForm(): JSX.Element {
    return (
        <EmailForm
            heading="Amnelden"
            helpInfo="Bei Ihrem Quipt Konto anmelden."
            onDataSubmit={onDataSubmit}
        />
    );
}

// verify-email
export function VerifyEmailForm({ email }: { email: string }): JSX.Element {
    return (
        <EmailCodeForm
            email={email}
            heading="E-Mail Addresse verifizieren"
            onDataSubmit={onDataSubmit}
        />
    );
}

// name
export function NameForm(): JSX.Element {
    return (
        <NameFormBase
            heading="Willkommen"
            helpInfo="Bitte geben Sie Ihren Namen ein, um die Einrichtung abzuschließen."
        />
    );
}

// password
export function PasswordForm(): JSX.Element {
    return (
        <PasswordFormBase
            heading="Identität bestätigen"
            helpInfo="Bitte geben Sie Ihr Passwort ein."
        />
    );
}

