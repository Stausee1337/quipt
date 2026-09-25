import connect from 'connect';
import serveStatic from 'serve-static';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as http from 'node:http';

import { createRequestHandler } from './server';
import { Options } from './getopts';

import * as config from 'virtual:custom-ssr/server-entry-config';

function getInt(x: string|undefined): number|undefined {
    if (x === undefined) return undefined;

    const number = parseInt(x);
    if (Number.isNaN(number)) return undefined;

    return number;
}

function main(
    argv: string[] = process.argv.slice(2)
) {
    const options = new Options();
    options
        .optflag('h', 'help', 'Display this message')
        .optopt('', 'host', 'specify hostname', 'host')
        .optopt('', 'port', 'specify port', 'port'); 

    const matches = options.parse(argv);
    if (matches.optPresent('help')) {
        process.stderr.write(options.usage('Usage: server [options]'));
        process.exit(1);
    }

    const host = matches.optString('host') ?? 'localhost';
    const port = getInt(matches.optString('port')) ?? 3000;

    const app = connect();

    const assetsPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        'assets'
    );

    app.use('/assets', serveStatic(assetsPath));

    const requestHandler = createRequestHandler(config);
    app.use(requestHandler);

    const server = http.createServer(app);
    server.listen(port, host, () => {
        console.log(`listening at http://${host}:${port}`);
    });

    ["SIGTERM", "SIGINT"].forEach((signal) => {
        process.once(signal, () => server?.close(console.error));
    });
}

if (import.meta.main)  {
    main();
}

