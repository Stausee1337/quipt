type VirtualModuleDescriptor = {
    id: string;
    resolvedId: string;
    url: string;
};

export default function create(name: string, namespace?: string) {
    const id = namespace ? `virtual:${namespace}/${name}` : `virtual:${name}`;
    return {
        id,
        resolvedId: `\0${id}`,
        url: `/@id/__x00__${id}`,
    };
}

export function virtualModuleNamespace<T>(
    namespace: string,
    build: (create: (name: string) => VirtualModuleDescriptor) => T
): T {
    return build((name) => create(name, namespace));
}

