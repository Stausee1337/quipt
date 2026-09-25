import { type JSX } from 'react';

import { AppOtpForm } from './components/app-otp-form';
import { CollectEmailForm } from './components/collect-email-form';
import { EmailOtpForm } from './components/email-otp-form';
import { IdentifyForm } from './components/identify-form';
import { NameForm as NameFormBase } from './components/name-form';
import { PasswordForm as PasswordFormBase } from './components/password-form';
import { VerifyEmailForm } from './components/verify-email-form';

const email = 'test@example.com';

export function NameForm(): JSX.Element {
    return (
        <NameFormBase
            heading="Willkommen"
            helpInfo="Bitte geben Sie Ihren Namen ein, um die Einrichtung abzuschließen."
        />
    );
}

export function PasswordForm(): JSX.Element {
    return (
        <PasswordFormBase
            heading="Identität bestätigen"
            helpInfo="Bitte geben Sie Ihr Passwort ein."
        />
    );
}

export function Authentication(): JSX.Element {
    return (
        <>
            <AppOtpForm />
            <CollectEmailForm />
            <EmailOtpForm email={email} />
            <IdentifyForm />
            <NameForm />
            <PasswordForm />
            <VerifyEmailForm email={email} />
        </>
    );
}
