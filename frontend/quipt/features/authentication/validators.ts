

type Validator = (value: any) => string|undefined;

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
};

export function lengthRange({min, max}: { min: number, max: number }): Validator {
    function getMessage() {
        return `Muss zwischen ${min} und ${max} Zeichen lang sein`;
    }

    return value => {
        if (typeof value === 'string')
            return value.length < min || value.length > max
                ? getMessage()
                : undefined;
    }
}

export function regex(regex: RegExp, message: string): Validator {
    return value => {
        if (typeof value === 'string')
            return value.match(regex) === null
                ? message
                : undefined;
    };
}

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function email(): Validator {
    return regex(emailRegex, 'Geben Sie eine gültige E-Mail Addresse ein');
}
