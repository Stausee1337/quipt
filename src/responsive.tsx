import { createContext, useState, JSX, useContext, useMemo, useEffect,  } from 'quipt/rexport';

// FIXME: maybe provide in rem
const MINIMUM_WIDTHS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    ['2xl']: 1536,
};

export type Breakpoints = {
    sm: boolean;
    md: boolean;
    lg: boolean;
    xl: boolean;
    ['2xl']: boolean;
};

function computeBreakpoints(): Breakpoints {
    return Object.fromEntries(
        Object.entries(MINIMUM_WIDTHS).map(([bp, minWidth]) => [bp, window.innerWidth >= minWidth]),
    ) as Breakpoints;
}

const BreakpointContextObj = createContext<Breakpoints|undefined>(undefined);

export function useBreakpoints(): Breakpoints {
    return useContext(BreakpointContextObj) ?? computeBreakpoints();
}

export function ResponsiveBreakpointProivder(props: { children?: JSX.Element }): JSX.Element {
    const queries = useMemo(() => Object.fromEntries(
        Object.entries(MINIMUM_WIDTHS).map(([bp, minWidth]) => [
            bp,
            window.matchMedia(`(width >= ${minWidth}px)`),
        ]),
    ), []);

    const states = Object.fromEntries(
        Object.entries(queries).map(([bp, query]) => [bp, useState(query.matches)]),
    );

    // FIXME: we're adding new events every time this function reruns
    useEffect(() => {
        const listeners = Object.fromEntries(Object.entries(queries).map(([bp, query]) => [bp, () => states[bp][1](query.matches)]));
        Object.entries(queries).forEach(([bp, query]) => query.addEventListener('change', () => listeners[bp]));
        return () => {
            Object.entries(queries).forEach(([bp, query]) => query.removeEventListener('change', () => listeners[bp]));
        }
    }, Object.values(states).map(s => s[1]))

    const responsiveBreakpoints: Record<string, boolean> = {};
    for (let [bp, signal] of Object.entries(states))
        responsiveBreakpoints[bp] = signal[0];

    return (
        <BreakpointContextObj.Provider value={responsiveBreakpoints as Breakpoints}>
            {props.children}
        </BreakpointContextObj.Provider>
    );
}
