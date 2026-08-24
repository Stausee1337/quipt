import { JSX, onMount } from 'solid-js';

import { A, Navigate } from '@solidjs/router';

import { useAuthentication } from 'quipt/client';

function LandingPage(): JSX.Element {
    return (
        <div class="landing-page">
            <h1>TODO: advertise Quipt</h1>
            <p>
                <A href="/signin">Login</A>
            </p>
            <p>
                <A href="/signup">Register</A>
            </p>
        </div>
    );
}

export function Root(): JSX.Element {
    const authentication = useAuthentication()!;
    onMount(() => {
        document.title = 'Quipt';
    });
    return <>{authentication.isLoggedIn() ? <Navigate href="/dashboard" /> : <LandingPage />}</>;
}
