
export type Color = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
                   13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;

const colorPaletteMapping = [
    // blues
    'sky-300',
    'sky-400',
    'blue-600',
    'blue-900',

    // greens
    'green-300',
    'lime-400',
    'green-500',
    'emerald-700',

    // yellows
    'yellow-200',
    'yellow-300',
    'yellow-400',
    'amber-500',

    // red(ish)s
    'red-200',
    'orange-500',
    'red-600',
    'rose-700',

    // purples & pinks
    'indigo-300',
    'pink-400',
    'violet-700',
    'purple-900',

    // browns
    'orange-200',
    'orange-300',
    'amber-700',
    'amber-900',
];

export const allColors = Object.freeze(Array.from({ length: 24 }).map((_, i) => i + 1)) as Readonly<Color[]>;

export function colorToString(color: Color): string {
    return colorPaletteMapping[color - 1];
}

type Lightness = 'light' | 'dark';

const lightnessMapping: Lightness[] = [
    'light',
    'light',
    'dark',
    'dark',

    'light',
    'light',
    'light',
    'dark',

    'light',
    'light',
    'light',
    'light',

    'light',
    'dark',
    'dark',
    'dark',

    'light',
    'light',
    'dark',
    'dark',

    'light',
    'light',
    'dark',
    'dark',
];

export function getColorLightness(color: Color): Lightness {
    return lightnessMapping[color - 1];
}

