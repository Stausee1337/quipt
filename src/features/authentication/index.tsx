import { JSX } from 'react';

import { BigButton } from 'quipt/components/button';

import { Form } from './components/form';
import { Field } from './components/field';
import { StyledLink } from 'quipt/components/link';

export function Authentication(): JSX.Element {
    return (
        <Form heading="Anmelden" helpInfo="Bei Ihrem Quipt Konto anmelden.">
            <Field label="E-Mail" name="email" required type="email" />
            <div className="flex items-center justify-between">
                <StyledLink to="signup">Konto erstellen</StyledLink>
                <BigButton variant="primary" type="submit">
                    Weiter
                </BigButton>
            </div>
        </Form>
    );
}
