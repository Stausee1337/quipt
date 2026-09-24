import { type Plugin, isRunnableDevEnvironment } from 'vite';

const virtualModuleId = 'virtual:test123';
const resolvedVirtualModuleId = '\0' + virtualModuleId;

export function customSSR(): Plugin[] {
    return [
        {
            name: 'custom-ssr',
            async config() {
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
                                rolldownOptions: {
                                    input: 'x',
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
                                },
                            },
                        },
                        ssr: {
                            consumer: 'server',
                            build: {
                                rolldownOptions: {
                                    input: './frontend/server/entry-prod.ts',
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
                            const build = (await ssrEnvironment.runner.import(
                                './frontend/server/entry-dev.ts',
                            )) as typeof import('../server/entry-dev.ts');

                            try {
                                await build.default(req, resp, server);
                                next();
                            } catch (e) {
                                console.error(e);
                                next();
                            }
                        });
                };
            },
            resolveId(id) {
                if (id === virtualModuleId) {
                    return resolvedVirtualModuleId;
                }
            },

            load(id) {
                if (id === resolvedVirtualModuleId) {
                    return `console.log('Hello, World!');`;
                }
            },
        },
    ];
}
