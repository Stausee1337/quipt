import { type JSX, useRef, useState } from 'react';

import { StyledLink } from 'quipt/components/link';
import { Form, type FormContentProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import type { ValueSubmitFunction } from '../util';

export interface PasswordFormProps extends FormContentProps {
    onValueSubmit?: ValueSubmitFunction<string> | undefined;
}

export function PasswordForm({ heading, helpInfo, onValueSubmit }: PasswordFormProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    async function onSubmit(formValues: { password: string }) {
        inputRef.current?.blur();
        setLoading(true);
        const result = onValueSubmit && (await onValueSubmit(formValues.password));
        setLoading(false);
        if (result?.status === 'error') setErrors({ password: 'Das Passwort ist falsch' });
    }

    return (
        <Form<{ password: string }>
            errors={errors}
            heading={heading}
            helpInfo={helpInfo}
            loading={loading}
            onFormSubmit={onSubmit}>
            <div className="flex flex-col gap-y-2">
                <TextField
                    ref={inputRef}
                    name="password"
                    label="Passwort"
                    type="password"

                    validate={validators.required()}
                    disabled={loading}
                    autoFocus
                />
                {/* FIXME: generate propper flow link */}
                <StyledLink to="/auth/password-reset">Passwort vergessen?</StyledLink>
            </div>
        </Form>
    );
}
