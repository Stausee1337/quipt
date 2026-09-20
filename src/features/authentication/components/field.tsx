import { ComponentProps, JSX, } from 'react';

import { Field as BaseField } from '@base-ui/react';

import { Icon } from 'quipt/components/icon';
import { BigInput } from 'quipt/components/input';

export interface FieldProps extends ComponentProps<typeof BigInput> {
    label: string;
}

export function Field({ label, ...props }: FieldProps): JSX.Element {
    return (
        <BaseField.Root name="test">
            <div className="relative">
                <BigInput
                    render={(props, {  touched, valid }) => 
                        <input data-error={touched && valid === false ? '' : undefined}
                            {...props}/>
                    }
                    aria-placeholder={label}
                    className="w-full border-accent-100/50! focus:not-data-primary:border-primary! data-error:border-red-500! data-error:data-focused:border-red-400!"
                    {...props}/>
                <BaseField.Label
                    render={(props, { focused, filled, touched, valid }) => 
                        <label
                            data-open={focused || filled ? '' : undefined}
                            data-error={touched && valid === false ? '' : undefined}
                            {...props}/>
                    }
                    className="select-none cursor-text text-accent-100/50 bg-background sm:bg-accent-10 absolute top-4 left-[calc(7*var(--spacing)-2.3px)] px-[2.3px] transition-transform data-open:scale-[0.875] data-open:-translate-y-[26.5px] data-focused:not-data-error:text-primary data-filled:data-error:text-red-500 data-focused:data-error:text-red-400">
                    { label }
                </BaseField.Label>
                <BaseField.Error
                    render={({children, ...props}, { touched, valid }) => (touched && valid === false ? (
                        <div className="flex gap-x-1 py-2 items-center text-red-500" {...props}>
                            <Icon iconName="exclamation-circle-fill"/>
                            {children}
                        </div>
                    ) : undefined) as JSX.Element}
                />
            </div>
        </BaseField.Root>
    );
}

