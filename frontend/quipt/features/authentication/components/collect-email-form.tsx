import { type JSX } from 'react';

import { EmailForm } from './email-form';
import { type Result, error } from '../util';

function onValueSubmit(_value: string) {
    return new Promise<Result<undefined, string>>(
        resolve => setTimeout(() => resolve(error('Es gibt bereits ein Konto mit dieser E-Mail')), 10000)
    );
}

export function CollectEmailForm(): JSX.Element {
    return (
        <EmailForm
            heading="Quipt Konto erstellen"
            helpInfo="Bitte geben Sie Ihre E-Mail Addresse ein."
            onValueSubmit={onValueSubmit}/>
    );
}
