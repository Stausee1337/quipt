import { type JSX } from 'react';

import { Field as BaseField, type FieldRootProps, type InputProps } from '@base-ui/react';

import { Icon } from 'quipt/components/icon';
import { BigInput } from 'quipt/components/input';

export interface FieldProps
    extends
        Pick<
            InputProps,
            'ref' | 'autoFocus' | 'inputMode' | 'value' | 'onValueChange' | 'onKeyDown' | 'onKeyUp'
        >,
        Pick<FieldRootProps, 'disabled' | 'name' | 'validate' | 'validationMode'> {
    label: string;

    type?: 'text' | 'password' | undefined;
}

export function TextField({
    label,

    ref,
    autoFocus,
    inputMode,
    disabled,
    type,
    value,
    onKeyDown,
    onKeyUp,
    onValueChange,

    name,
    validate,
    validationMode,
}: FieldProps): JSX.Element {
    return (
        <BaseField.Root
            disabled={disabled}
            name={name}
            validate={validate}
            validationMode={validationMode}>
            <div className="relative">
                <BigInput
                    ref={ref}
                    render={(props, { touched, valid }) => (
                        <input
                            data-error={touched && valid === false ? '' : undefined}
                            {...props}
                        />
                    )}
                    type={type}
                    value={value}
                    autoFocus={autoFocus}
                    inputMode={inputMode}
                    onKeyDown={onKeyDown}
                    onKeyUp={onKeyUp}
                    onValueChange={onValueChange}

                    aria-placeholder={label}
                    className="border-accent-100/50! focus:not-data-primary:border-primary! w-full data-error:border-red-500! data-error:data-focused:border-red-400!"
                />
                <BaseField.Label
                    render={(props, { focused, filled, touched, valid }) => (
                        <label
                            data-open={focused || filled ? '' : undefined}
                            data-error={touched && valid === false ? '' : undefined}
                            {...props}
                        />
                    )}
                    className="text-accent-100/50 bg-background sm:bg-accent-10 data-focused:not-data-error:text-primary absolute top-4 left-[calc(7*var(--spacing)-2.3px)] cursor-text px-[2.3px] transition-transform select-none data-filled:data-error:text-red-500 data-focused:data-error:text-red-400 data-open:-translate-y-[26.5px] data-open:scale-[0.875]">
                    {label}
                </BaseField.Label>
                <BaseField.Error
                    render={({ children, ...props }, { touched, valid }) =>
                        (touched && valid === false ? (
                            <div className="flex items-center gap-x-1 pt-2 text-red-500" {...props}>
                                <Icon iconName="exclamation-circle-fill" />
                                {children}
                            </div>
                        ) : undefined) as JSX.Element
                    }
                />
            </div>
        </BaseField.Root>
    );
}
