import type { Config } from 'prettier';
import pluginSortImports from '@trivago/prettier-plugin-sort-imports';
import * as pluginTailwindcss from 'prettier-plugin-tailwindcss';

const config: Config = {
    plugins: [pluginSortImports, pluginTailwindcss],
    tabWidth: 4,
    singleQuote: true,
    printWidth: 100,
    bracketSameLine: true,
    arrowParens: "avoid",
    importOrder: [
        "solid-js(/web)?",
        "<THIRD_PARTY_MODULES>",
        "^quipt/(.*)$",
        "^[./]"
    ],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
};

export default config;
