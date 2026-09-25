import { type JSX } from 'react';

import { EmailForm } from './email-form';
import { type Result, error } from '../util';

function onValueSubmit(_value: string) {
    return new Promise<Result<undefined, string>>(
        resolve => setTimeout(() => resolve(error('Dieses Konto wurde nicht gefunden')), 10000)
    );
}

export function IdentifyForm(): JSX.Element {
    return (
        <EmailForm 
            heading="Amnelden"
            helpInfo="Bei Ihrem Quipt Konto anmelden."
            onValueSubmit={onValueSubmit}/>
    );
}
