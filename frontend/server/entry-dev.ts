import type * as Vite from 'vite';

import type * as http from 'node:http';

import { handleNodeRequest } from './server';
import data from './base.html';

export type DevHandlerFunction = (
    nodeReq: Vite.Connect.IncomingMessage,
    nodeResp: http.ServerResponse<Vite.Connect.IncomingMessage>,
    viteDevServer: Vite.ViteDevServer,
) => Promise<void>;

const devHandlerFunction: DevHandlerFunction = async (nodeReq, nodeResp, viteDevServer) => {
    const template = await viteDevServer.transformIndexHtml(nodeReq.originalUrl ?? '/', data);
    await handleNodeRequest(nodeReq, nodeResp, template);
};

export default devHandlerFunction;
