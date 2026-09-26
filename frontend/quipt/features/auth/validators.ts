type Validator = (value: any) => string | undefined;

export function multi(...validators: Validator[]): Validator {
    return value => {
        for (let validator of validators) {
            const message = validator(value);
            if (message) return message;
        }
    };
}

export function required(): Validator {
    return value =>
        typeof value !== 'string' || value.length === 0
            ? 'Dieses Feld ist erforderlich'
            : undefined;
}

export function lengthRange(min: number, max?: number): Validator {
    function getMessage() {
        if (max === undefined || !max) return `Muss mindestens ${min} Zeichen lang sein`;
        if (min === 0) return `Darf maximal ${max} Zeichen lang sein`;
        return `Muss zwischen ${min} und ${max} Zeichen lang sein`;
    }

    return value => {
        if (typeof value === 'string')
            return value.length < min || (max && value.length > max) ? getMessage() : undefined;
    };
}

export function regex(regex: RegExp, message: string): Validator {
    return value => {
        if (typeof value === 'string') return value.match(regex) === null ? message : undefined;
    };
}

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function email(): Validator {
    return regex(emailRegex, 'Geben Sie eine gültige E-Mail Addresse ein');
}
