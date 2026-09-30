import { type JSX, useState } from 'react';

import { StyledLink } from 'quipt/components/link';
import { Form, type FormBaseProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { useFlow } from './flow';

export interface PasswordFormProps extends FormBaseProps<'password'> {
}

export function PasswordForm({ ...props }: PasswordFormProps): JSX.Element {
    const { loading, state } = useFlow();

    const [value, setValue] = useState(state.data.password ?? '');

    return (
        <Form 
            helpInfo="Bitte geben Sie Ihr Passwort ein."
            {...props}
        >
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
