import { type JSX } from 'react';

import { SigninFlow } from './components/signin-flow';
// import { HydrationBoundary } from 'quipt/components/hydration-boundary';

export function Authentication(): JSX.Element {
    return (
        <SigninFlow/>
    );
}
