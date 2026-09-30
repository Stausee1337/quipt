import { type JSX, useState, useEffect } from 'react';

import { Button } from '@base-ui/react';

import { CodeForm } from './code-form';
import type { FormDataProps } from './form';

const codeLength = 8;
const initialTimerTime = 60;

export interface EmailCodeFormProps extends FormDataProps<'code'> {
    email?: string | undefined;
    heading: string;
    defaultValue?: string | undefined;
}

export function EmailCodeForm({ email, ...props }: EmailCodeFormProps): JSX.Element {
    const [timerValue, setTimerValue] =
        typeof window !== 'undefined' ? useState(initialTimerTime) : [initialTimerTime, () => {}];

    useEffect(() => {
        const x = setInterval(() => {
            setTimerValue(v => v && v - 1);
        }, 1000);
        return () => clearInterval(x);
    }, []);

    async function onCodeResend() {
        await new Promise<boolean>(resolve => setTimeout(resolve, 500));
        setTimerValue(initialTimerTime);
    }

    return (
        <CodeForm
            codeLength={codeLength}
            helpInfo={
                email ? (
                    <>
                        Bitte geben Sie den Code ein, den wir an <strong>{email}</strong> gesendet
                        haben.
                    </>
                ) : (
                    <>
                        Bitte geben Sie den Code ein, den wir an ihre E-Mail Addresse gesendet
                        haben.
                    </>
                )
            }
            {...props}>
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
