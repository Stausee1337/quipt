import { Accessor, createEffect, createSignal, onCleanup, onMount } from "solid-js";

export class QuiptFormEvent extends Event {
    constructor(
        public valid: boolean,
        public formData: Record<string, string>
    ) {
        super('quiptsubmit');
    }
}

export class QuiptInputEvent extends Event {
    constructor(
        public kind: 'quiptvalidationchange',
        public value: string,
        public valid: boolean,
        public message: string|undefined
    ) {
        super(kind);
    }

}

export interface FormData {
    data: Record<string, string>;
    valid: boolean;
    submitted: boolean;
    readonly error: string|undefined;
    blur(name?: string): void;
    focus(name: string): void;
    resetInput(name?: string): void;
    postErrorMessage(message: string): void;
}

export function createReactiveFormData(): FormData {
    const [data, setData] = createSignal<Record<string, string>>({});
    const [valid, setValid] = createSignal<boolean>(false);
    const [submitted, setSubmitted] = createSignal<boolean>(false);
    const [formError, setFormError] = createSignal<string>();
    
    return {
        get data() {
            return data();
        },
        set data(value) {
            setData(value);
        },
        get valid() {
            return valid();
        },
        set valid(value) {
            setValid(value);
        },
        get submitted() {
            return submitted();
        },
        set submitted(value) {
            setSubmitted(value);
        },
        get error() {
            return formError();
        },
        blur() {},
        focus() {},
        resetInput() {},
        postErrorMessage(message) {
            setFormError(message);
        },
    };
}

export function quiptForm(element: HTMLFormElement, formData: Accessor<FormData>) {
    let valueBinding: Record<string, string> = {};
    let validBinding: Record<string, boolean> = {};
    let elementBinding: Record<string, HTMLInputElement> = {};

    createEffect(() => {
        const currentFormData = formData();
        if (currentFormData.submitted) {
            element.classList.add('submitted');
        } else {
            element.classList.remove('submitted');
        }

        if (currentFormData.error) {
            element.classList.add('error');
        } else {
            element.classList.remove('error');
        }

        currentFormData.resetInput = (name) => {
            if (name !== undefined) {
                const element = elementBinding[name];
                if (element !== undefined)
                    element.value = '';
                return;
            }
            for (const element of Object.values(elementBinding))
                element.value = ''; 
        };

        currentFormData.focus = (name) => {
            const element = elementBinding[name];
            if (element !== undefined)
                element.focus();
            return;
        };

        currentFormData.blur = (name) => {
            if (name !== undefined) {
                const element = elementBinding[name];
                if (element !== undefined)
                    element.blur();
                return;
            }
            for (const element of Object.values(elementBinding))
                element.blur(); 
        };
    });

    function onSubmit(e: SubmitEvent) {
        e.preventDefault();

        const currentFormData = formData();
        currentFormData.submitted = true;

        const event = new QuiptFormEvent(currentFormData.valid, valueBinding);
        element.dispatchEvent(event);
    }

    function onInputChange(e: Event & { еееValue: string, еееValid: boolean }) {
        if (!(e.target instanceof HTMLInputElement))
            return;
        valueBinding[e.target.name] = e.еееValue;
        validBinding[e.target.name] = e.еееValid;
        const currentFormData = formData();
        currentFormData.data = {...valueBinding};
        currentFormData.valid = Object.values(validBinding).every(x => x);
    }

    element.addEventListener('submit', onSubmit);
    element.addEventListener('еееInputChange', onInputChange)
    const observer = new MutationObserver(createBinding);

    function createBinding() {
        valueBinding = {};
        validBinding = {};
        elementBinding = {};
        for (const input of Array.from(element)) {
            if (!(input instanceof HTMLInputElement))
                continue;
            valueBinding[input.name] = input.value;
            validBinding[input.name] = input.classList.contains('valid');
            elementBinding[input.name] = input;
        }
        const currentFormData = formData();
        currentFormData.data = valueBinding;
        currentFormData.valid = Object.values(validBinding).every(x => x);
    }

    onMount(() => {
        createBinding();
        observer.observe(element, { childList: true, subtree: true });
    })

    onCleanup(() => {
        element.removeEventListener('submit', onSubmit);
        observer.disconnect()
    })
}

export interface Validator {
    validate(v: string): boolean;
    message: string
}

export function quiptValidator(element: HTMLInputElement, validataors: Accessor<Validator | Validator[]>) {
    type Pristineness = "pristine"|"dirty";
    type Touchedness = "untouched"|"touched";
    type Validity = "invalid"|"valid";

    const [value, setValue] = createSignal<string>(element.value);
    const [validity, setValidity] = createSignal<Validity>("invalid");
    const [touchedness, setTouchedness] = createSignal<Touchedness>("untouched");
    const [pristineness, setPristineness] = createSignal<Pristineness>("pristine");

    onMount(() => {
        const [message, validity] = runValidators();
        setValidity(validity);
        element.dispatchEvent(new QuiptInputEvent(
            'quiptvalidationchange',
            value(), validity === "valid", message
        ));
    })

    createEffect<Pristineness>(prev => {
        const current = pristineness();
        element.classList.remove(prev)
        element.classList.add(current)
        return current;
    }, pristineness())

    createEffect<Touchedness>(prev => {
        const current = touchedness();
        element.classList.remove(prev)
        element.classList.add(current)
        return current;
    }, touchedness())

    createEffect<Validity>(prev => {
        const current = validity();
        element.classList.remove(prev)
        element.classList.add(current)
        return current;
    }, validity())

    createEffect(() => {
        const event = new Event('еееInputChange', { bubbles: true }) as (Event & { еееValue: string, еееValid: boolean });
        event.еееValue = value();
        event.еееValid = validity() === "valid";
        element.dispatchEvent(event);
    })

    element.classList.add(pristineness());
    element.classList.add(touchedness());
    element.classList.add(validity());

    element.addEventListener('change', valueChange);
    element.addEventListener('input', valueChange);

    element.addEventListener('blur', focusChange);

    createEffect(() => {
        const [message, validity] = runValidators();
        setValidity(validity);
        element.dispatchEvent(new QuiptInputEvent(
            'quiptvalidationchange',
            value(), validity === "valid", message
        ));
    });

    function valueChange() {
        setValue(element.value);
        setPristineness("dirty");
    }

    function focusChange() {
        setTouchedness("touched");
    }

    function runValidators(): [undefined, "valid"]|[string, "invalid"] {
        const currentValidators = validataors();
        const validatorsArray = Array.isArray(currentValidators)
            ? currentValidators 
            : [currentValidators];

        const currentValue = value();
        for (const validator of validatorsArray) {
            if (!validator.validate(currentValue))
                return [validator.message, "invalid"]
        }

        return [undefined, "valid"]
    }
}

export namespace validators {
    export const required = {
        validate(value: string): boolean {
            return value !== "";
        },
        message: 'Dieses Feld ist erforderlich'
    }

    export function minLength(min: number): Validator {
        return {
            validate(value: string): boolean {
                return min <= value.length;
            },
            message: `Muss zwischen mindestens ${min} Zeichen lang sein`
        };
    }

    export function lengthRange(min: number, max: number): Validator {
        return {
            validate(value: string): boolean {
                return min <= value.length && value.length <= max;
            },
            message: `Muss zwischen ${min} und ${max} Zeichen lang sein`
        };
    }

    export function regex(regex: RegExp, message: string): Validator {
        return {
            validate(value: string): boolean {
                return value.match(regex) !== null;
            },
            message
        };
    }

    export function equal(accesor: Accessor<string>, name: string): Validator {
        return {
            validate(value: string): boolean {
                return value === accesor();
            },
            message: `Feld stimmt nicht mit ${name} überein`
        };
    }
}

declare global {
interface HTMLElementEventMap {
    'quiptsubmit': QuiptFormEvent,
    'еееInputChange': Event & { еееValue: string, еееValid: boolean },
}
}

declare module "solid-js" {
    namespace JSX {
        interface DirectiveFunctions {
            quiptForm: typeof quiptForm;
            quiptValidator: typeof quiptValidator;
        }

        interface CustomEventHandlersCamelCase<T> {
            onQuiptSubmit?: EventHandlerUnion<T, QuiptFormEvent> | undefined;
            onQuiptValidationChange?: EventHandlerUnion<T, QuiptInputEvent> | undefined;
        }
    }
}
