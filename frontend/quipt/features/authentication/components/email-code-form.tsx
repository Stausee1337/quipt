import { type JSX, useState, useEffect } from 'react';

import { Button } from '@base-ui/react';

import { CodeForm } from './code-form';
import type { DataSubmitFunction2 } from '../flow';

const codeLength = 8;
const initialTimerTime = 60;

export interface EmailOtpFormProps {
    email: string;
    heading: string;
    onDataSubmit?: DataSubmitFunction2<{ code: 'invalid-code' }>;
}

export function EmailCodeForm({ heading, email, onDataSubmit }: EmailOtpFormProps): JSX.Element {
    const [timerValue, setTimerValue] =
        typeof window !== 'undefined' ? useState(initialTimerTime) : [initialTimerTime, () => {}];

    useEffect(() => {
        timerValue && setTimeout(() => setTimerValue(v => v - 1), 1000);
    }, [timerValue]);

    async function onCodeResend() {
        await new Promise<boolean>(resolve => setTimeout(resolve, 500));
        setTimerValue(initialTimerTime);
    }

    return (
        <CodeForm
            codeLength={codeLength}
            heading={heading}
            helpInfo={
                <>
                    Bitte geben Sie den Code ein, den wir an <strong>{email}</strong> gesendet
                    haben.
                </>
            }
            onDataSubmit={onDataSubmit}>
            <div className="flex">
                <Button
                    disabled={timerValue > 0}
                    onClick={onCodeResend}
                    className="text-link cursor-pointer font-medium underline data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50">
                    {timerValue > 0
                        ? `Code in ${timerValue} Sekunden erneut senden`
                        : 'Code erneut senden'}
                </Button>
            </div>
        </CodeForm>
    );
}
