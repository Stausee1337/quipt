import { JSX } from 'react';

import { Link } from 'react-router';

import { BigButton } from 'quipt/components/button'; 

import { Form } from './components/form'; 
import { Field } from './components/field'; 

export function Authentication(): JSX.Element {
    return (
        <Form 
            heading="Anmelden"
            helpInfo="Bei Ihrem Quipt Konto anmelden.">
            <Field label="E-Mail" name="email" required type="email"/>
            <div className="flex justify-between items-center">
                <Link to="signup">Konto Erstellen</Link>
                <BigButton variant="primary">
                    Weiter
                </BigButton>
            </div>
        </Form>
    );
}

