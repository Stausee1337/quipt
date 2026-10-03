import { StrictMode } from 'react';
import ReactDOMServer from 'react-dom/server';
import {
    type RouteObject,
    type StaticHandlerContext,
    StaticRouterProvider,
    matchRoutes,
    createStaticHandler,
    createStaticRouter,
} from 'react-router';
import { createRequest, sendResponse } from '@remix-run/node-fetch-server';

import type * as http from 'node:http';

import { type ServerEntryConfig, ServerConfigProvider, createRouterRoute } from '../shared/routing';

export type RequestHandler = (
    nodeReq: http.IncomingMessage,
    nodeResp: http.ServerResponse,
) => Promise<void>;

function createServerRoutes(config: ServerEntryConfig): RouteObject[] {
    return Object.entries(config.entries).map(([id, entry]) => ({
        id,
        ...createRouterRoute(entry),
    }));
}

export function createRequestHandler(config: ServerEntryConfig): RequestHandler {
    const routes = createServerRoutes(config);
    const staticHandler = createStaticHandler(routes);

    async function handleNodeRequest(
        nodeReq: http.IncomingMessage,
        nodeResp: http.ServerResponse,
    ) {
        const req = createRequest(nodeReq, nodeResp, {
            protocol: getForwardedProtocol(nodeReq),
        });
        const resp = await handleRequest(req);
        sendResponse(nodeResp, resp);
    }


    async function handleRequest(request: Request) {
        let context = await staticHandler.query(request);

        if (context instanceof Response) {
            return context;
        }

        let renderedLayout: string;
        try {
            const router = createStaticRouter(staticHandler.dataRoutes, context);
            renderedLayout = ReactDOMServer.renderToString(
                <StrictMode>
                    <ServerConfigProvider config={config}>
                        <StaticRouterProvider context={context} router={router} />
                    </ServerConfigProvider>
                </StrictMode>,
            );
        } catch (error) {
            console.error(error);

            const baseContext = context;
            const matches = matchRoutes(
                staticHandler.dataRoutes,
                { pathname: '/' },
                '/'
            ) ?? [];
            context = {
                basename: '/',
                errors: {
                    [matches?.[0].route.id ?? '']: {
                        status: 500,
                        statusText: 'Internal Server Error',
                        data: error,
                    }
                },
                actionData: {},
                loaderData: {},
                matches,
                loaderHeaders: {},
                actionHeaders: {},
                location: baseContext.location,
                statusCode: 500
            } satisfies StaticHandlerContext;

            const router = createStaticRouter(staticHandler.dataRoutes, context);
            renderedLayout = ReactDOMServer.renderToString(
                <StrictMode>
                    <ServerConfigProvider config={config}>
                        <StaticRouterProvider context={context} router={router} />
                    </ServerConfigProvider>
                </StrictMode>,
            );
        }

        const html = `<!DOCTYPE html>${renderedLayout}`;
        return new Response(html, {
            status: context.statusCode,
            headers: { 'Content-Type': 'text/html' },
        });
    }

    return async (nodeReq, nodeResp) => {
        return await handleNodeRequest(nodeReq, nodeResp);
    };
}


function getForwardedProtocol(nodeReq: http.IncomingMessage): string | undefined {
    const forwardedProto = nodeReq.headers['x-forwarded-proto'];
    let proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)
        ?.split(',')[0]
        .trim()
        .toLowerCase();

    if (proto?.endsWith(':')) proto = proto.slice(0, -1);

    return proto === 'http' || proto === 'https' ? `${proto}:` : undefined;
}
