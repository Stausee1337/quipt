import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

import { RouterProvider, createBrowserRouter } from 'react-router';

import { type RouteConfigEntry, createRouterRoute } from '../shared/routing';

export default(entry: RouteConfigEntry, id: string) => {
    const routes = [{
        id,
        ...createRouterRoute(entry)
    }];
    const router = createBrowserRouter(routes);

    hydrateRoot(
        document,
        <StrictMode>
            <RouterProvider router={router} />
        </StrictMode>,
    );

}
