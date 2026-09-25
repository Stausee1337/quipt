import { type Plugin, type Manifest as ViteManifest, isRunnableDevEnvironment, normalizePath } from 'vite';

import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { virtualModuleNamespace } from './virtual-module.ts';
import type { EntryMetaInfo, ServerEntryConfig } from '../shared/routing.tsx';
import type * as devServerEntry from '../server/entry-dev.ts';

const clientEntry = './frontend/quipt/entry-client.tsx';
const serverEntry = './frontend/server/entry-prod.ts';

const virtual = virtualModuleNamespace('custom-ssr', create => ({
    serverEntryConfig: create('server-entry-config'),

}));

function resolveEntrypointURL(rootDir: string, entrypoint: string) {
    const relativePath = path.relative(rootDir, entrypoint);
    const url = `/${normalizePath(relativePath)}`;
    return url;
}

function getId(module: string): string {
    return createHash('sha256')
        .update(module)
        .digest('base64')
        .slice(0, 8);
}

type EntryManifest = {
    meta: EntryMetaInfo[];
    entryModule: string;
};

function getServerEntryConfig({
    clientManifest,
    serverManifest
}: {
        clientManifest: EntryManifest,
        serverManifest: EntryManifest
}) {
        return `\
${Object.values(serverManifest.meta).map((entrypoint, idx) => 
    `import route${idx} from ${JSON.stringify(entrypoint.module)};`)
    .join('\n')}
export const clientEntryModule = ${JSON.stringify(clientManifest.entryModule)};
export const meta = {${clientManifest.meta.map(route => 
    `${JSON.stringify(route.id)}: ${JSON.stringify(route)}`).join()}};
export const entries = {${clientManifest.meta.map((route, idx) => 
    `${JSON.stringify(route.id)}: route${idx}`).join()}};`;
}


function loadViteManifest(directory: string) {
    const manifestContents = readFileSync(
        path.resolve(directory, '.vite', 'manifest.json'),
        'utf-8',
    );
    return JSON.parse(manifestContents) as ViteManifest;
};

function resolveModuleToChunk(moduleFilePath: string, viteManifest: ViteManifest) {
    const rootRelativeFilePath = normalizePath(
        moduleFilePath.startsWith('/') ? moduleFilePath.slice(1) : moduleFilePath
    );
    let entryChunk = viteManifest[rootRelativeFilePath];

    if (!entryChunk)
        throw new Error(`Chunk not found: ${moduleFilePath}`);

    return entryChunk;
}

function resolveModulesToChunks(manifest: EntryManifest, viteManifest: ViteManifest): EntryManifest {
    return {
        meta: manifest.meta.map(entry => ({
            id: entry.id,
            module: `/${resolveModuleToChunk(entry.module, viteManifest).file}`,
        })),
        entryModule: `/${resolveModuleToChunk(manifest.entryModule, viteManifest).file}`
    };

}

export function customSSR(entrypoints: string[]): Plugin[] {
    let rootDir: string;
    let viteCommand: string;
    let clientEntrypoint: string;
    let serverEntrypoint: string;

    function generateManifest(entrypoint: string): EntryManifest {
        const meta = entrypoints.map(entrypoint => {
            const id = getId(entrypoint);

            return {
                id,
                module: resolveEntrypointURL(rootDir, entrypoint),
            };
        });
        return {
            meta,
            entryModule: resolveEntrypointURL(rootDir, entrypoint),
        };
    }

    function generateManifestsForBuild(): { 
        clientManifest: EntryManifest,
        serverManifest: EntryManifest
    } {
        const serverManifest = generateManifest(clientEntrypoint);
        const viteManifest = loadViteManifest(
            path.join(rootDir, 'dist') // TODO: factor out
        );
        const clientManifest = resolveModulesToChunks(serverManifest, viteManifest);
        serverManifest.entryModule = serverEntrypoint;
        return { clientManifest, serverManifest };
    }

    return [
        {
            name: 'custom-ssr',
            async config(config, env) {
                rootDir = config.root ?? process.cwd();
                clientEntrypoint = path.join(rootDir, clientEntry);
                serverEntrypoint = path.join(rootDir, serverEntry);
                viteCommand = env.command;

                return {
                    appType: 'custom',
                    builder: {
                        sharedConfigBuild: true,
                        sharedPlugins: true,
                    },
                    environments: {
                        client: {
                            consumer: 'client',
                            build: {
                                manifest: true,
                                rolldownOptions: {
                                    input: [
                                        ...entrypoints,
                                        clientEntrypoint,
                                    ],
                                    output: {
                                        codeSplitting: {
                                            groups: [
                                                {
                                                    name: 'react-vendor',
                                                    test: /node_modules[\\/]react/,
                                                },
                                                {
                                                    name: 'ui-vendor',
                                                    test: /node_modules[\\/]@base-ui/,
                                                },
                                            ],
                                        },
                                    },
                                    preserveEntrySignatures: 'strict',
                                },
                            },
                        },
                        ssr: {
                            consumer: 'server',
                            build: {
                                emitAssets: true,
                                emptyOutDir: false,
                                rolldownOptions: {
                                    input: serverEntrypoint,
                                },
                            },
                        },
                    },
                };
            },
            configureServer(server) {
                return () => {
                    if (!server.config.server.middlewareMode)
                        server.middlewares.use(async (req, resp, next) => {
                            const ssrEnvironment = server.environments.ssr;
                            if (!isRunnableDevEnvironment(ssrEnvironment)) {
                                next();
                                return;
                            }
                            const [devServerModule, config] = await Promise.all([
                                ssrEnvironment.runner
                                    .import<typeof devServerEntry>(
                                        path.join(rootDir, './frontend/server/entry-dev.ts')
                                    ),
                                ssrEnvironment.runner
                                    .import<ServerEntryConfig>(virtual.serverEntryConfig.id),
                            ]);

                            const handleRequest = devServerModule.createRequestHandler(config);

                            try {
                                await handleRequest(req, resp);
                                next();
                            } catch (e) {
                                console.error(e);
                                next();
                            }
                        });
                };
            },
            resolveId(id) {
                const x = Object.values(virtual).find(vmod => vmod.id === id);
                return x?.resolvedId;
            },

            load(id) {
                switch (id) {
                    case virtual.serverEntryConfig.resolvedId:
                    {
                        if (viteCommand === 'build') {
                            const manifests = generateManifestsForBuild();
                            return getServerEntryConfig(manifests);
                        } else {
                            const manifest = generateManifest(clientEntrypoint);
                            return getServerEntryConfig({
                                serverManifest: manifest,
                                clientManifest: manifest
                            });
                        }
                    }
                }
            },
        },
    ];
}


