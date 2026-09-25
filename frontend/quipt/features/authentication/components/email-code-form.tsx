import { type JSX, useState, useEffect } from 'react';

import { Button } from '@base-ui/react';

import { CodeForm } from './code-form';
import { type ValueSubmitFunction } from '../util';

const codeLength = 8;
const initialTimerTime = 60;

export interface EmailOtpFormProps {
    email: string;
    heading: string;
    onValueSubmit?: ValueSubmitFunction | undefined;
}

export function EmailCodeForm({ heading, email, onValueSubmit }: EmailOtpFormProps): JSX.Element {
    const [timerValue, setTimerValue] = useState(initialTimerTime);

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
            onValueSubmit={onValueSubmit}>
            <div className="flex">
                <Button
                    disabled={timerValue > 0}
                    onClick={onCodeResend}
                    className="text-link font-medium underline cursor-pointer data-disabled:opacity-50 data-disabled:pointer-events-none data-disabled:cursor-not-allowed">
                    { timerValue > 0 
                        ? `Code in ${timerValue} Sekunden erneut senden`
                        : 'Code erneut senden'
                    }
                </Button>
            </div>
        </CodeForm>
    );
}
