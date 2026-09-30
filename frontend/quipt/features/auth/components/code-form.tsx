import { type JSX, useRef, useState, useEffect } from 'react';

import { Form, type FormActions, type FormProps, type FormBaseProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { useFlow } from './flow';

export interface CodeFormProps extends FormProps<'code'> {
    codeLength: number;
}

export function CodeForm({
    actionsRef: outerActionsRef,
    children,
    codeLength,
    ...props
}: CodeFormProps): JSX.Element {
    const actionsRef = useRef<FormActions>(null);

    const { loading, state } = useFlow();

    const [value, setValue] = useState(state.data.code ?? '');

    useEffect(() => {
        value.length === codeLength && actionsRef.current && actionsRef.current.submit();
    }, [value]);

    return (
        <Form actionsRef={actionsRef} {...props}>
            <TextField
                name="code"
                label="Code"
                inputMode="numeric"
                value={value}
                onValueChange={v => v.length <= codeLength && isNumeric(v) && setValue(v)}

                validate={validators.multi(
                    validators.required(),
                    validators.lengthRange(codeLength),
                )}
                disabled={loading}
                autoFocus
            />
            {children}
        </Form>
    );
}

export interface AppCodeFormProps extends FormBaseProps<'code'> {
}

export function AppCodeForm(props: AppCodeFormProps): JSX.Element {
    return (
        <CodeForm codeLength={6}
            helpInfo="Bitte geben Sie den Code aus Ihrer Zwei-Faktor-Authentisierungsapp ein."
            {...props}
        />
    );
}

function isNumeric(value: string): boolean {
    for (let idx = 0; idx < value.length; idx++) {
        const code = value.charCodeAt(idx);
        if (code < 0x30 || code > 0x39) return false;
    }
    return true;
}
