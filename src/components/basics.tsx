import { JSX, splitProps } from 'solid-js';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button(
    props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
        variant: ButtonVariant;
    },
): JSX.Element {
    const [, rest] = splitProps(props, ['variant', 'class', 'classList']);
    return (
        <button
            class={`border-lighter1 h-8 cursor-pointer rounded-full border px-4 font-medium ${props.class ?? ''}`}
            classList={{
                'bg-primary active:bg-[#03b66a]': props.variant === 'primary',
                'bg-inherit hover:bg-lighter1 active:bg-accent1': props.variant === 'secondary',
                'bg-qpt-red active:bg-[#f1695e]': props.variant === 'danger',
                ...props.classList,
            }}
            {...rest}
        />
    );
}

export function IconButton(
    props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
        icon: string;
    },
) {
    const [, rest] = splitProps(props, ['icon', 'class', 'children']);
    return (
        <button class={`h-10 w-10 cursor-pointer text-2xl ${props.class ?? ''}`} {...rest}>
            <i class={`bi bi-${props.icon}`} />
        </button>
    );
}
