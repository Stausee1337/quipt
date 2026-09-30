import { type JSX, useState } from 'react';

import { Form, type FormContentProps, type FormDataProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { useFlow } from './flow';

const nameRegex = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;

export interface NameFormProps extends FormContentProps, FormDataProps<'name'> {
    defaultValue?: string | undefined;
}

export function NameForm({ defaultValue, ...props }: NameFormProps): JSX.Element {
    const { loading } = useFlow();

    const [value, setValue] = useState(defaultValue ?? '');

    return (
        <Form {...props}>
            <TextField
                name="name"
                label="Ihr Name"

                value={value}
                onValueChange={setValue}

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
