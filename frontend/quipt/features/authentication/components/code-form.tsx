import { type JSX, type ReactNode, useRef, useState, useEffect } from 'react';

import { Form, type FormContentProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { type DataSubmitFunction2, useDataSubmit } from '../flow';

export function isNumeric(value: string): boolean {
    for (let idx = 0; idx < value.length; idx++) {
        const code = value.charCodeAt(idx);
        if (code < 0x30 || code > 0x39) return false;
    }
    return true;
}

export interface CodeFormProps extends FormContentProps {
    codeLength: number;
    children?: ReactNode | undefined;
    onDataSubmit?: DataSubmitFunction2<{ code: 'invalid-code' }>;
}

export function CodeForm({
    children,
    codeLength,
    onDataSubmit,
    ...props
}: CodeFormProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const [value, setValue] = useState('');
    const [onSubmit, loading, errors] = useDataSubmit(onDataSubmit, { code: inputRef });

    useEffect(() => {
        if (value.length === codeLength) buttonRef.current && buttonRef.current.click();
    }, [value]);

    return (
        <Form
            submitButtonRef={buttonRef}
            errors={errors}
            loading={loading}
            onFormSubmit={onSubmit}
            {...props}>
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
                disabled={loading}
                autoFocus
            />
            {children}
        </Form>
    );
}
