import { Component, ComponentProps, JSX, createMemo, onMount, splitProps } from 'solid-js';
import { createDynamic } from 'solid-js/web';

type ContentComponent = Component<{ children: JSX.Element } & any>;

type EditableProps<T extends ContentComponent, P = ComponentProps<T>> = {
    [K in keyof P]: P[K];
} & {
    component: T;
    children: string;
    isEditable: boolean;
    onContentChange: (newContent: string) => void;
    onEditEnd: () => void;
};

export function MakeEditableContent<T extends ContentComponent>(
    props: EditableProps<T>,
): JSX.Element {
    const [, rest] = splitProps(props, ['component', 'children']) as [unknown, ComponentProps<T>];

    const childComputation = createMemo<JSX.Element>(() => {
        let inputElement: HTMLInputElement | undefined;
        onMount(() => {
            if (!inputElement) return;
            inputElement.focus();
            inputElement.select();
        });

        if (!props.isEditable) return props.children;
        return (
            <input
                ref={inputElement}
                class="injected-input"
                value={props.children}
                onBlur={() => props.onEditEnd()}
                onInput={e => props.onContentChange(e.currentTarget.value)}
            />
        );
    });
    rest.children = childComputation as unknown as JSX.Element;

    return createDynamic(() => props.component, rest);
}
