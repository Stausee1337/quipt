import { RouteObject } from 'react-router';

import { App } from 'quipt/App';
import { ErrorBoundary } from 'quipt/components/error-boundary';

export default [
    {
        path: '',
        Component: App,
        ErrorBoundary: ErrorBoundary,
        children: [
            { index: true, element: <h1>Hello, World!</h1> },
            { path: 'test', element: <p>You are on the nested test page</p> },
        ],
    },
] satisfies RouteObject[];
