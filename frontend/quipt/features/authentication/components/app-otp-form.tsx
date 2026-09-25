import { type JSX } from 'react';

import { CodeForm } from './code-form';
import { type Result, error } from '../util';

const codeLength = 6;

function onValueSubmit(_value: string) {
    return new Promise<Result>(resolve => setTimeout(() => resolve(error()), 10000));
}

export function AppOtpForm(): JSX.Element {
    return (
        <CodeForm
            codeLength={codeLength}
            heading="Identität bestätigen"
            helpInfo="Bitte geben Sie den Code aus Ihrer Zwei-Faktor-Authentisierungsapp ein."
            onValueSubmit={onValueSubmit}
        />
    );
}
