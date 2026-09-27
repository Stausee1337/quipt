import { type JSX, type ReactNode, useRef, useState, useEffect } from 'react';

import { Form, type FormContentProps, type FormDataProps } from './form';
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
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const [value, setValue] = useState('');

    useEffect(() => {
        if (value.length === codeLength) buttonRef.current && buttonRef.current.click();
    }, [value]);

    return (
        <Form submitButtonRef={buttonRef} {...props}>
            <TextField
                ref={inputRef}
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
