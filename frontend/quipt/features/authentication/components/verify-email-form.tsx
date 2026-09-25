import { type JSX } from 'react';

import { EmailCodeForm } from './email-code-form';
import { type Result, error } from '../util';

function onValueSubmit(_value: string) {
    return new Promise<Result>(resolve => setTimeout(() => resolve(error()), 10000));
}

export function VerifyEmailForm({ email }: { email: string }): JSX.Element {
    return (
        <EmailCodeForm
            email={email}
            heading="E-Mail Addresse verifizieren"
            onValueSubmit={onValueSubmit}
        />
    );
}
