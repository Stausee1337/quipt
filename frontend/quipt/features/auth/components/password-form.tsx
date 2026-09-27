import { type JSX, useRef } from 'react';

import { StyledLink } from 'quipt/components/link';
import { Form, type FormContentProps, type FormDataProps, useDataSubmit } from './form';
import { TextField } from './field';
import * as validators from '../validators';

export interface PasswordFormProps
    extends FormContentProps, FormDataProps<{ password: 'incorrect-password' }> {}

export function PasswordForm({ heading, helpInfo, ...props }: PasswordFormProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);
    const [_, loading] = useDataSubmit(null as unknown as any, { password: inputRef });

    return (
        <Form heading={heading} helpInfo={helpInfo} loading={loading} {...props}>
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
