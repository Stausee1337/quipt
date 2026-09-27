import { type JSX, type ReactNode, useRef, useState, useEffect } from 'react';

import { Form, type FormActions, type FormContentProps, type FormDataProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';

export interface CodeFormProps extends FormContentProps, FormDataProps<{ code: 'invalid-code' }> {
    codeLength: number;
    children?: ReactNode | undefined;
}

function isNumeric(value: string): boolean {
    for (let idx = 0; idx < value.length; idx++) {
        const code = value.charCodeAt(idx);
        if (code < 0x30 || code > 0x39) return false;
    }
    return true;
}

export function CodeForm({ children, codeLength, ...props }: CodeFormProps): JSX.Element {
    const actionsRef = useRef<FormActions>(null);

    const [value, setValue] = useState('');

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
                disabled={props.loading} // FIXME: maybe do *only* provide `loading` via context.
                autoFocus
            />
            {children}
        </Form>
    );
}
