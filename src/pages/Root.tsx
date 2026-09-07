import { JSX, useEffect } from 'react';

import { Link, Navigate } from 'react-router';

import { useAuthentication } from 'quipt/client';

function LandingPage(): JSX.Element {
    return (
        <div className="landing-page">
            <h1>TODO: advertise Quipt</h1>
            <p>
                <Link to="/signin">Login</Link>
            </p>
            <p>
                <Link to="/signup">Register</Link>
            </p>
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
