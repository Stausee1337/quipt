import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

import { RouterProvider, createBrowserRouter } from 'react-router';

import { type EntryRouteExport, makeRoute } from '../shared/routing';

export default function main(entryRoute: EntryRouteExport) {
    const routes = [makeRoute(entryRoute)];
    const router = createBrowserRouter(routes);

    hydrateRoot(
        document,
        <StrictMode>
            <RouterProvider router={router} />
        </StrictMode>,
    );

}
