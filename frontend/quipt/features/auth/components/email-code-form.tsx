import { type JSX, useState, useEffect } from 'react';

import { Button } from '@base-ui/react';

import { linkStyle } from 'quipt/components/link';
import { CodeForm } from './code-form';
import type { FormBaseProps } from './form';
import { useFlow } from './flow';

const codeLength = 8;
const initialTimerTime = 60;

export interface EmailCodeFormProps extends FormBaseProps<'code'> {}

export function EmailCodeForm({ ...props }: EmailCodeFormProps): JSX.Element {
    const { state } = useFlow();

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
                state.data.email ? (
                    <>
                        Bitte geben Sie den Code ein, den wir an <strong>{state.data.email}</strong>{' '}
                        gesendet haben.
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
                    onClick={() => timerValue > 0 && onCodeResend()}
                    className={linkStyle}>
                    {timerValue > 0
                        ? `Code in ${timerValue} Sekunden erneut senden`
                        : 'Code erneut senden'}
                </Button>
            </div>
        </CodeForm>
    );
}
