import { type JSX, type ReactNode, useState } from 'react';

import { Form, type FormBaseProps } from './form';
import { TextField } from './field';
import * as validators from '../validators';
import { useFlow } from './flow';

const nameRegex = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;

export interface NameFormProps extends FormBaseProps<'name'> {
    helpInfo: ReactNode;
}

export function NameForm({ ...props }: NameFormProps): JSX.Element {
    const { loading, state } = useFlow();

    const [value, setValue] = useState(state.data.name ?? '');

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
