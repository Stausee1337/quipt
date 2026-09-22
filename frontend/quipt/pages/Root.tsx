import { JSX, useEffect } from 'react';

import { Link, Navigate } from 'react-router';

import { useAuthentication } from 'quipt/client';
import { BigButton, Button } from 'quipt/components/button';
import { BigInput, Input } from 'quipt/components/input';
import { Icon } from 'quipt/components/icon';

function LandingPage(): JSX.Element {
    return (
        <div className="p-1">
            <h1>TODO: advertise Quipt</h1>
            <p>
                <Link to="/signin">Login</Link>
            </p>
            <p>
                <Link to="/signup">Register</Link>
            </p>
            <div>
                <Button variant="primary">Button</Button>
                <Button variant="primary" disabled>
                    Button
                </Button>
                <Button variant="secondary">Button</Button>
                <Button variant="secondary" disabled>
                    Button
                </Button>
                <Button variant="danger">Button</Button>
                <Button variant="danger" disabled>
                    Button
                </Button>
            </div>
            <div>
                <BigButton variant="primary">Button</BigButton>
                <BigButton variant="primary" disabled>
                    Button
                </BigButton>
                <BigButton variant="secondary">Button</BigButton>
                <BigButton variant="secondary" disabled>
                    Button
                </BigButton>
                <BigButton variant="danger">Button</BigButton>
                <BigButton variant="danger" disabled>
                    Button
                </BigButton>
            </div>
            <div>
                <Input placeholder="Placeholder" />
                <BigInput placeholder="Placeholder" />
            </div>
            <div>
                <Icon iconName="exclamation-circle-fill" />
                <Icon iconName="quipt-logo" />
                <Icon iconName="quipt-logo" className="h-16 w-auto" />
            </div>
        </div>
    );
}

export function Root(): JSX.Element {
    const authentication = useAuthentication()!;
    useEffect(() => {
        document.title = 'Quipt';
    }, []);
    return <>{authentication.isLoggedIn ? <Navigate to="/dashboard" /> : <LandingPage />}</>;
}
