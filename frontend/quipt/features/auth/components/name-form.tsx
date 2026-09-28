import { type JSX } from 'react';

import { Form, type FormContentProps, type FormDataProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { useFlow } from './flow';

const nameRegex = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;

export interface NameFormProps extends FormContentProps, FormDataProps<'name'> {}

export function NameForm({ heading, helpInfo, ...props }: NameFormProps): JSX.Element {
    const { loading } = useFlow();

    return (
        <Form heading={heading} helpInfo={helpInfo} {...props}>
            <TextField
                name="name"
                label="Ihr Name"

                validate={validators.multi(
                    validators.required(),
                    validators.regex(nameRegex, 'Name enthält ungültige Zeichen'),
                )}
                disabled={loading}
                autoFocus
            />
        </Form>
    );
}
