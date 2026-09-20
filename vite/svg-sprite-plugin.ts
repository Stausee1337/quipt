import { Plugin } from 'vite'

import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { optimize } from 'svgo';
import { XmlDocument, XmlElement } from 'xmldoc';

interface SvgSpritePluginOptions {
    iconDir: string;
}
const virtualModuleId = 'virtual:icons-meta';
const resolvedVirtualModuleId = '\0' + virtualModuleId;

export function svgSprite({
    iconDir
}: SvgSpritePluginOptions): Plugin {
    let { data: svgSpriteData, meta } = compileToSprite(iconDir);
    let spriteMetaData = JSON.stringify(meta);
    function dirChange() {
        console.log('Icon Direcotry Changed');
        const { data, meta } = compileToSprite(iconDir);
        svgSpriteData = data;
        spriteMetaData = JSON.stringify(meta);
    }

    return {
        name: 'svg-sprite',

        configureServer(server) {
            server.middlewares.use('/icon-sprites.svg', (_req, res) => {
                res.setHeader('Content-Type', 'image/svg+xml');
                res.end(svgSpriteData);
            })

            server.watcher.add(iconDir);

            server.watcher.on('add', filterEvents(iconDir, dirChange));
            server.watcher.on('change', filterEvents(iconDir, dirChange));
            server.watcher.on('unlink', filterEvents(iconDir, dirChange));
        },
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'icon-sprites.svg',
                source: svgSpriteData
            });
        },
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId
            }
        },

        load(id) {
            if (id === resolvedVirtualModuleId) {
                return `
export const iconsMeta = ${spriteMetaData};
export default iconsMeta;
`
            }
        },
    }
}

type ViewBox = {
    width: number;
    height: number;
};

type IconSprite = {
    data: string;
    meta: Record<string, ViewBox>;
};

function compileToSprite(iconDir: string): IconSprite {
    const files = readdirSync(iconDir);

    const symbols = [];
    const meta: Record<string, Omit<Symbol, 'data'>> = {}
    for (const file of files) {
        let rawSvgData;
        try {
             rawSvgData = readFileSync(path.join(iconDir, file), { encoding: 'utf-8' });
        } catch  {
            continue;
        }
        const name = file.replace(/.svg$/i, '');
        // const {data, viewBox} = convertToSymbol(parser, builder, rawSvgData, name);
        const {data,  ...symbol} = convertToSymbolXmldoc(rawSvgData, name);
        symbols.push(data);
        meta[name] = symbol;
    }

    const data = `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>`;
    return {
        data,
        meta,
    };
}

type Symbol = {
    data: string;
    viewBox: string;
    width: number;
    height: number;
};

function convertToSymbolXmldoc(unoptimizedData: string, id: string): Symbol {
    const optimizedData = optimize(unoptimizedData, {
        plugins: [
            'preset-default',
        ],
    }).data;

    const doc = new XmlDocument(optimizedData);

    const width = Number(doc.attr.width);
    const height = Number(doc.attr.height);
    const viewBox = doc.attr.viewBox;

    const symbolElement = new XmlElement({
        name: 'symbol',
        attributes: { id, viewBox }
    });
    symbolElement.children.push(...doc.children);

    const data = symbolElement.toString({
        compressed: true
    });

    return {
        data,
        viewBox,
        width,
        height
    };
}

function filterEvents(
    directory: string,
    cb: () => void
): (file: string) => void {
    return (file: string) => {
        if (file.startsWith(directory))
            cb();
    };
}

