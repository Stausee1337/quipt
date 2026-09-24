import type * as Vite from 'vite';

import type * as http from 'node:http';

import { handleNodeRequest } from './server';

export type DevHandlerFunction = (
    nodeReq: Vite.Connect.IncomingMessage,
    nodeResp: http.ServerResponse<Vite.Connect.IncomingMessage>,
    viteDevServer: Vite.ViteDevServer,
) => Promise<void>;

const devHandlerFunction: DevHandlerFunction = async (nodeReq, nodeResp, viteDevServer) => {
    await handleNodeRequest(nodeReq, nodeResp);
};

export default devHandlerFunction;
