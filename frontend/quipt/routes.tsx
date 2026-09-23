import { RouteObject } from 'react-router';
import { App } from './App';

export default [
    {
        path: '',
        Component: App,
        children: [{ path: 'test', element: <p>You are on the nested test page</p> }],
    },
] satisfies RouteObject[];
