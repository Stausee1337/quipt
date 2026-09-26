import { type JSX } from 'react';

import {
    AppOtpForm,
    CollectEmailForm,
    EmailOtpForm,
    IdentifyForm,
    NameForm,
    PasswordForm,
    VerifyEmailForm,
} from './components/forms';

const email = 'test@example.com';


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
