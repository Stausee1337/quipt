import { ComponentProps, JSX, JSXElementConstructor, useEffect, useRef } from 'quipt/rexport';

type ComponentType = keyof JSX.IntrinsicElements | JSXElementConstructor<any>;

type EditableProps<T extends ComponentType, P = ComponentProps<T>> = P & {
    component: T;
    isEditable: boolean;
    onContentChange: (newContent: string) => void;
    onEditEnd: () => void;
};

export function MakeEditableContent<T extends ComponentType>(
    { component: Component, children, isEditable, onEditEnd, onContentChange, ...rest }: EditableProps<T>,
): JSX.Element {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const element = inputRef.current;
        if (element !== null && element.isConnected) {
            element.focus();
            element.select();
        }
    }, [inputRef.current]);

    return (
        <Component {...rest}>
            {isEditable ? (
                <input
                    ref={inputRef}
                    className="w-full outline-none"
                    value={children}
                    onBlur={() => onEditEnd()}
                    onInput={e => onContentChange(e.currentTarget.value)}
                />
            ) : (
                children
            )}
        </Component>
    );
}
