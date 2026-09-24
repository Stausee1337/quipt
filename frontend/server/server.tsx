import { StrictMode } from 'react';
import ReactDOMServer from 'react-dom/server';
import { RouteObject, StaticRouterProvider, createStaticHandler, createStaticRouter } from 'react-router';
import { createRequest, sendResponse } from '@remix-run/node-fetch-server';

import type * as http from 'node:http';

import * as appRoute from 'quipt/entrypoints/app';
import { makeRoute } from '../shared/routing';

const routes = [makeRoute(appRoute)] satisfies RouteObject[];

export async function handleNodeRequest(
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
    const { query, dataRoutes } = createStaticHandler(routes);
    const context = await query(request);

    if (context instanceof Response) {
        return context;
    }

    const router = createStaticRouter(dataRoutes, context);
    const renderedLayout = ReactDOMServer.renderToString(
        <StrictMode>
            <StaticRouterProvider context={context} router={router} />
        </StrictMode>,
    );

    const html = `<!DOCTYPE html>${renderedLayout}`;
    return new Response(html, {
        status: context.statusCode,
        headers: { 'Content-Type': 'text/html' }
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
