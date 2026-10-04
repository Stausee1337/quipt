import * as client from './global-contexts.client';
import * as server from './global-contexts.server';

export const Providers = import.meta.env.SSR ? server.Providers : client.Providers;
