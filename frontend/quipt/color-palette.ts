export type Color =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24;

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

export function ensureColor(x: number, fallback: Color = 1): Color {
    if (!Number.isInteger(x)) return fallback;
    if (x >= 1 && x <= 24) return x as Color;
    return fallback;
}

export const allColors = Object.freeze(Array.from({ length: 24 }).map((_, i) => i + 1)) as Readonly<
    Color[]
>;

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

function colorToParts(color: Color): [string, number] {
    const string = colorToString(color);
    const [name, intensity] = string.split('-');
    return [name, parseInt(intensity)];
}

const lighterColorCache: Partial<Record<Color, string>> = {};

export function asLighterColor(color: Color): string {
    let lighterColor = lighterColorCache[color];
    if (lighterColor !== undefined) return lighterColor;
    const [name, intensity] = colorToParts(color);
    lighterColor = `${name}-${intensity === 100 ? 50 : intensity - 100}`;
    lighterColorCache[color] = lighterColor;
    return lighterColor;
}

const darkerColorCache: Partial<Record<Color, string>> = {};

export function asDarkerColor(color: Color): string {
    let darkerColor = darkerColorCache[color];
    if (darkerColor !== undefined) return darkerColor;
    const [name, intensity] = colorToParts(color);
    darkerColor = `${name}-${intensity === 900 ? 950 : intensity + 100}`;
    darkerColorCache[color] = darkerColor;
    return darkerColor;
}
