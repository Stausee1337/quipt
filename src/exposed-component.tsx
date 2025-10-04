import { JSX } from "solid-js";

export type MappedObject<T> = {
    [P in keyof T]: T[P]
};

export type ExposedComponent<T> = Array<JSX.Element> & MappedObject<T>;
export type TemplatedObject = { template: JSX.Element };
export type ComponentDescriptor<T> = MappedObject<T> & TemplatedObject;

export function bindComponent<T>(desc: ComponentDescriptor<T>): ExposedComponent<T>  {
    const result = [desc.template] as ExposedComponent<T>;
    for (const key of Object.getOwnPropertyNames(desc)) {
        if (key === "template")
            continue;
        const prop = Object.getOwnPropertyDescriptor(desc, key);
        Object.defineProperty(result, key, { ...prop });
    }

    Object.freeze(result);

    return result;
}

