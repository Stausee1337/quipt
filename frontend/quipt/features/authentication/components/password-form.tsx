import { type JSX, useRef } from 'react';

import { StyledLink } from 'quipt/components/link';
import { Form, type FormContentProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { type DataSubmitFunction, useDataSubmit } from '../flow';

export interface PasswordFormProps extends FormContentProps {
    onDataSubmit?: DataSubmitFunction<{ password: 'incorrect-password' }>;
}

export function PasswordForm({ heading, helpInfo, onDataSubmit }: PasswordFormProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    const [onSubmit, loading, errors] = useDataSubmit(onDataSubmit, { password: inputRef });

    return (
        <Form
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
