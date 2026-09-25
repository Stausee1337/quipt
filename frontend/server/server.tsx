import { StrictMode } from 'react';
import ReactDOMServer from 'react-dom/server';
import {
    type RouteObject,
    StaticRouterProvider,
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

export function createRequestHandler(config: ServerEntryConfig): RequestHandler {
    return async (nodeReq, nodeResp) => {
        return await handleNodeRequest(nodeReq, nodeResp, config);
    };
}

async function handleNodeRequest(
    nodeReq: http.IncomingMessage,
    nodeResp: http.ServerResponse,
    config: ServerEntryConfig,
) {
    const req = createRequest(nodeReq, nodeResp, {
        protocol: getForwardedProtocol(nodeReq),
    });
    const resp = await handleRequest(req, config);
    sendResponse(nodeResp, resp);
}

export function createServerRoutes(config: ServerEntryConfig): RouteObject[] {
    return Object.entries(config.entries).map(([id, entry]) => ({
        id,
        ...createRouterRoute(entry),
    }));
}

async function handleRequest(request: Request, config: ServerEntryConfig) {
    const routes = createServerRoutes(config);
    const { query, dataRoutes } = createStaticHandler(routes);
    const context = await query(request);

    if (context instanceof Response) {
        return context;
    }

    const router = createStaticRouter(dataRoutes, context);
    const renderedLayout = ReactDOMServer.renderToString(
        <StrictMode>
            <ServerConfigProvider config={config}>
                <StaticRouterProvider context={context} router={router} />
            </ServerConfigProvider>
        </StrictMode>,
    );

    const html = `<!DOCTYPE html>${renderedLayout}`;
    return new Response(html, {
        status: context.statusCode,
        headers: { 'Content-Type': 'text/html' },
    });
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
