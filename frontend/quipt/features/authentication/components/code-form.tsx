import { type JSX, type ReactNode, useRef, useState, useEffect } from 'react';

import { Form, type FormContentProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { type ValueSubmitFunction, isNumeric } from '../util';

export interface CodeFormProps extends FormContentProps {
    codeLength: number;
    children?: ReactNode | undefined;
    onValueSubmit?: ValueSubmitFunction | undefined;
}

export function CodeForm({
    children,
    codeLength,
    onValueSubmit,
    ...props
}: CodeFormProps): JSX.Element {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ code?: string | undefined }>({});

    async function onSubmit(formValues: { code: string }) {
        inputRef.current?.blur();
        setLoading(true);
        const result = onValueSubmit && (await onValueSubmit(formValues.code));
        setLoading(false);
        if (result?.status === 'error') setErrors({ code: 'Ungültiger Code' });
    }

    useEffect(() => {
        if (value.length === codeLength) buttonRef.current && buttonRef.current.click();
    }, [value]);

    return (
        <Form<{ code: string }>
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
