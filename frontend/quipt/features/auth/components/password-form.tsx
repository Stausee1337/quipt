import { type JSX } from 'react';

import { StyledLink } from 'quipt/components/link';
import { Form, type FormContentProps, type FormDataProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';

export interface PasswordFormProps
    extends FormContentProps, FormDataProps<{ password: 'incorrect-password' }> {}

export function PasswordForm({ heading, helpInfo, ...props }: PasswordFormProps): JSX.Element {
    return (
        <Form heading={heading} helpInfo={helpInfo} {...props}>
            <div className="flex flex-col gap-y-2">
                <TextField
                    name="password"
                    label="Passwort"
                    type="password"

                    validate={validators.required()}
                    disabled={props.loading}
                    autoFocus
                />
                {/* FIXME: generate propper flow link */}
                <StyledLink to="/auth/password-reset">Passwort vergessen?</StyledLink>
            </div>
        </Form>
    );
}
