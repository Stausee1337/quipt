import { type JSX, useState } from 'react';

import { StyledLink } from 'quipt/components/link';
import { Form, type FormContentProps, type FormDataProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { useFlow } from './flow';

export interface PasswordFormProps extends FormContentProps, FormDataProps<'password'> {
    defaultValue?: string | undefined;
}

export function PasswordForm({ defaultValue, ...props }: PasswordFormProps): JSX.Element {
    const { loading } = useFlow();

    const [value, setValue] = useState(defaultValue ?? '');

    return (
        <Form {...props}>
            <div className="flex flex-col gap-y-2">
                <TextField
                    name="password"
                    label="Passwort"
                    type="password"

                    value={value}
                    onValueChange={setValue}

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
