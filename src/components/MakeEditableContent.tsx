import { Component, ComponentProps, JSX, createEffect, createSignal, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

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
    const [inputElement, setInputElement] = createSignal<HTMLInputElement | undefined>(undefined);
    const [, rest] = splitProps(props, ['component', 'children']);

    createEffect(() => {
        const element = inputElement();
        if (element !== undefined && element.isConnected) {
            element.focus();
            element.select();
        }
    });

    return (
        <Dynamic component={props.component} {...rest}>
            {props.isEditable ? (
                <input
                    ref={setInputElement}
                    class="w-full outline-none"
                    value={props.children}
                    onBlur={() => props.onEditEnd()}
                    onInput={e => props.onContentChange(e.currentTarget.value)}
                />
            ) : (
                props.children
            )}
        </Dynamic>
    );
}
