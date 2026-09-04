import { JSX, useEffect, useMemo, useRef, useState, useContext, createContext, Component, ComponentProps, EffectCallback, JSXElementConstructor, CSSProperties, ReactNode, Ref, RefAttributes } from 'react';

export type Accessor<T> = T;

export function onMount(effect: EffectCallback) {
    useEffect(effect);
}

export function onCleanup(effect: EffectCallback) {
    useEffect(effect, []); // FIXME: I don't know if this works
}

export { type JSX, type Component, type ComponentProps, type JSXElementConstructor, type CSSProperties, type ReactNode, type Ref, type RefAttributes, useEffect, useMemo, useRef, useState, useContext, createContext };

