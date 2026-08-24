import type { Config } from 'prettier';
import plugin from '@trivago/prettier-plugin-sort-imports';

const config: Config = {
    plugins: [plugin],
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
