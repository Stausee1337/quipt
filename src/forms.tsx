import { useEffect, useState, useMemo, onMount, useRef, Ref } from 'quipt/rexport';

export interface Validator {
    validate(v: string): boolean;
    message: string;
}

export type Pristineness = 'pristine' | 'dirty';
export type Touchedness = 'untouched' | 'touched';
export type Validity = 'invalid' | 'valid';

export type InputCreateOptions = {
    defaultValue?: string;
    validators?: Validator[];
};

type InputChangeEvent = {
    name: string;
    value: string;
    validity: Validity;
    pristineness: Pristineness;
    touchedness: Touchedness;
    message: string | undefined;
};
type InputChangeHandler = (event: InputChangeEvent) => void;

type InputHookProps = InputCreateOptions & {
    name: string;
    onInputChange: InputChangeHandler;
    onInputMount: (name: string, element: HTMLInputElement) => void;
};

export type FormInputProps = {
    ref: Ref<HTMLInputElement>,
    name: string,
    onInput: () => void,
    onChange: () => void,
    onBlur: () => void,
    value: string,
    pristineness: Pristineness,
    touchedness: Touchedness,
    validity: Validity

};

export type InputCreateFn = (options?: InputCreateOptions) => FormInputProps;
type Inputs<T extends readonly string[]> = { [K in T[number]]: InputCreateFn };

type VailationMessages<T extends readonly string[]> = { [K in T[number]]: string | undefined };

type UseFormHook<T extends readonly string[]> = Inputs<T> & {
    form: Record<string, any>;
    validationMessages: VailationMessages<T>;
};

export type FormEvent<T extends readonly string[]> = {
    elements: { [K in T[number]]: HTMLInputElement | undefined };
    validity: Validity;
    formData: { [K in T[number]]: string };
    validationMessages: { [K in T[number]]: string | undefined };
};

export type FormOptions<T extends readonly string[]> = {
    onSubmit: (event: FormEvent<T>) => void;
    onChange?: (event: FormEvent<T>) => void;
};

export function useForm<const T extends readonly string[]>(
    keys: T,
    options: FormOptions<T>,
): UseFormHook<T> {
    const [inputElements, setInputElements] = useState<
        Record<string, HTMLInputElement | undefined>
    >(Object.fromEntries(keys.map(k => [k, undefined])));
    const [validationMessages, setValidationMessages] = useState<
        Record<string, string | undefined>
    >(Object.fromEntries(keys.map(k => [k, undefined])));
    const [inputValues, setInputValues] = useState<Record<string, string>>(
        Object.fromEntries(keys.map(k => [k, ''])),
    );
    const [validities, setInputValidities] = useState<Record<string, Validity>>(
        Object.fromEntries(keys.map(k => [k, 'valid'])),
    );

    const formValidity = useMemo<Validity>(() => {
        for (let validity of Object.values(validities))
            if (validity === 'invalid') return 'invalid';
        return 'valid';
    }, Object.values(validities));

    function createInputHook(props: {
        name: string;
        onInputMount: (name: string, element: HTMLInputElement) => void;
        onInputChange: InputChangeHandler;
    }): InputCreateFn {
        return options => inputHook({ ...props, ...options });
    }

    function onInputMount(name: string, element: HTMLInputElement) {
        setInputElements(r => ({ ...r, [name]: element }));
    }

    function onInputChange(event: InputChangeEvent) {
        setValidationMessages(r => ({ ...r, [event.name]: event.message }));
        setInputValues(r => ({ ...r, [event.name]: event.value }));
        setInputValidities(r => ({ ...r, [event.name]: event.validity }));
    }

    const inputHooks = useMemo(() => {
        const inputHooks: Record<string, InputCreateFn> = {};
        keys.forEach(key => {
            inputHooks[key] = createInputHook({ name: key, onInputMount, onInputChange });
        });
        return inputHooks;
    }, []);


    function makeFormEvent(): FormEvent<any> {
        return {
            elements: inputElements,
            validity: formValidity,
            validationMessages,
            formData: inputValues,
        };
    }

    function onSubmit(event: SubmitEvent) {
        event.preventDefault();
        options.onSubmit(makeFormEvent());
    }

    useEffect(() => {
        const formEvent = makeFormEvent();
        options?.onChange?.(formEvent);
    }, [formValidity, ...Object.values(inputValues)]);

    return {
        form: {
            onSubmit,
        },
        validationMessages,
        ...inputHooks,
    } as unknown as UseFormHook<T>;
}

function inputHook(props: InputHookProps): FormInputProps {
    const elementRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState<string>(props?.defaultValue ?? '');
    const [validity, setValidity] = useState<Validity>('valid');
    const [touchedness, setTouchedness] = useState<Touchedness>('untouched');
    const [pristineness, setPristineness] = useState<Pristineness>('pristine');
    const [validationMessage, setValidationMessage] = useState<string>();

    function runValidators(): { validity: Validity; message: string | undefined } {
        const validatorsArray = props?.validators ?? [];

        for (const validator of validatorsArray) {
            if (!validator.validate(value))
                return { validity: 'invalid', message: validator.message };
        }

        return { validity: 'valid', message: undefined };
    }

    function valueChange() {
        setValue(elementRef.current?.value ?? '');
        setPristineness('dirty');
    }

    function focusChange() {
        setTouchedness('touched');
    }

    useEffect(() => {
        const validationResult = runValidators();
        setValidity(validationResult.validity);
        setValidationMessage(validationResult.message);
    }, [value]);

    onMount(() => {
        const inputElement = elementRef.current;
        inputElement && props.onInputMount(props.name, inputElement);
    });

    useEffect(() => {
        props.onInputChange({
            name: props.name,
            value,
            message: validationMessage,
            validity,
            pristineness,
            touchedness,
        });
    }, [value, validity, pristineness, touchedness]);

    return {
        ref: elementRef,
        name: props.name,
        onInput: valueChange,
        onChange: valueChange,
        onBlur: focusChange,
        value,
        pristineness,
        touchedness,
        validity
    };
}

export namespace validators {
    export const required = {
        validate(value: string): boolean {
            return value !== '';
        },
        message: 'Dieses Feld ist erforderlich',
    };

    export function minLength(min: number): Validator {
        return {
            validate(value: string): boolean {
                return min <= value.length;
            },
            message: `Muss zwischen mindestens ${min} Zeichen lang sein`,
        };
    }

    export function lengthRange(min: number, max: number): Validator {
        return {
            validate(value: string): boolean {
                return min <= value.length && value.length <= max;
            },
            message: `Muss zwischen ${min} und ${max} Zeichen lang sein`,
        };
    }

    export function regex(regex: RegExp, message: string): Validator {
        return {
            validate(value: string): boolean {
                return value.match(regex) !== null;
            },
            message,
        };
    }

    export function equal(accesor: string, name: string): Validator {
        return {
            validate(value: string): boolean {
                return value === accesor;
            },
            message: `Feld stimmt nicht mit ${name} überein`,
        };
    }
}
