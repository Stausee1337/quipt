import { type ParseArgsOptionDescriptor, parseArgs } from 'node:util';

type OptGroup = {
    shortName: string;
    longName: string;
    description: string;
    hint: string;
    hasarg: boolean;
};

export class Options {
    groups: OptGroup[] = [];

    opt(shortName: string, longName: string, description: string, hint: string, hasarg: boolean) {
        if (shortName.length !== 0 && shortName.length !== 1)
            throw 'the short_name (first argument) should be a single character, or an empty string for none';
        if (longName.length === 1)
            throw 'the long_name (second argument) should be longer than a single character, or an empty string for none';
        this.groups.push({ shortName, longName, description, hint, hasarg });
        return this;
    }

    optflag(shortName: string, longName: string, description: string) {
        return this.opt(shortName, longName, description, '', false);
    }

    optopt(shortName: string, longName: string, description: string, hint: string) {
        return this.opt(shortName, longName, description, hint, true);
    }

    parse(args: string[], allowPositionals?: boolean | undefined) {
        const options = Object.fromEntries(
            this.groups.map<[string, ParseArgsOptionDescriptor]>(group => [
                group.longName.length > 0 ? group.longName : group.shortName,
                {
                    type: group.hasarg ? 'string' : 'boolean',
                    multiple: false,
                    ...(group.shortName.length > 0 ? { short: group.shortName } : {}),
                },
            ]),
        );
        const result = parseArgs({
            args,
            allowPositionals,
            options,
        });
        return new Matches(result.positionals, result.values);
    }

    usage(brief: string) {
        const descSep = `\n${' '.repeat(24)}`;
        const rows = this.groups.map(({ shortName, longName, hint, description, hasarg }) => {
            let row = '    ';
            if (shortName.length > 0) {
                row += `-${shortName}`;
                if (longName.length > 0) row += ', ';
                else row += ' ';
            } else row += '    ';

            if (longName.length > 0) row += `--${longName} `;

            if (hasarg) row += hint;

            if (row.length < 24) row += ' '.repeat(24 - row.length);
            else row += descSep;

            row += description;

            return row;
        });
        return `${brief}\n\nOptions:\n${rows.join('\n')}\n`;
    }
}

export class Matches {
    constructor(
        public positionals: string[],
        private values: {
            [longOption: string]: undefined | string | boolean | Array<string | boolean>;
        },
    ) {}

    optPresent(name: string): boolean {
        return this.values[name] !== undefined;
    }

    optString(name: string): string | undefined {
        if (typeof this.values[name] === 'string') return this.values[name];
        return undefined;
    }
}
