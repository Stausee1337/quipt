import { type Plugin, isRunnableDevEnvironment } from 'vite';

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
                                    input: './frontend/quipt/index.tsx',
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
        },
        {
            name: 'custom-ssr:embed-html',
            transform: {
                filter: { id: /\.html$/ },
                handler(src) {
                    return {
                        code: `
const data = ${JSON.stringify(src)};
export default data;
`,
                        map: null,
                    };
                },
            },
        },
    ];
}
