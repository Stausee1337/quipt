import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace auth. */
export namespace auth {

    /** Properties of a User. */
    interface IUser {

        /** User id */
        id?: (string|null);

        /** User username */
        username?: (string|null);

        /** User verified */
        verified?: (boolean|null);
    }

    /** Represents a User. */
    class User implements IUser {

        /**
         * Constructs a new User.
         * @param [properties] Properties to set
         */
        constructor(properties?: auth.IUser);

        /** User id. */
        public id: string;

        /** User username. */
        public username: string;

        /** User verified. */
        public verified: boolean;

        /**
         * Encodes the specified User message. Does not implicitly {@link auth.User.verify|verify} messages.
         * @param message User message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: auth.IUser, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a User message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns User
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): auth.User;

        /**
         * Creates a User message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns User
         */
        public static fromObject(object: { [k: string]: any }): auth.User;

        /**
         * Creates a plain object from a User message. Also converts values to other types if specified.
         * @param message User
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: auth.User, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this User to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for User
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SigninRequest. */
    interface ISigninRequest {

        /** SigninRequest username */
        username?: (string|null);

        /** SigninRequest password */
        password?: (string|null);
    }

    /** Represents a SigninRequest. */
    class SigninRequest implements ISigninRequest {

        /**
         * Constructs a new SigninRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: auth.ISigninRequest);

        /** SigninRequest username. */
        public username: string;

        /** SigninRequest password. */
        public password: string;

        /**
         * Encodes the specified SigninRequest message. Does not implicitly {@link auth.SigninRequest.verify|verify} messages.
         * @param message SigninRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: auth.ISigninRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SigninRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SigninRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): auth.SigninRequest;

        /**
         * Creates a SigninRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SigninRequest
         */
        public static fromObject(object: { [k: string]: any }): auth.SigninRequest;

        /**
         * Creates a plain object from a SigninRequest message. Also converts values to other types if specified.
         * @param message SigninRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: auth.SigninRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SigninRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SigninRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SignupRequest. */
    interface ISignupRequest {

        /** SignupRequest username */
        username?: (string|null);

        /** SignupRequest password */
        password?: (string|null);
    }

    /** Represents a SignupRequest. */
    class SignupRequest implements ISignupRequest {

        /**
         * Constructs a new SignupRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: auth.ISignupRequest);

        /** SignupRequest username. */
        public username: string;

        /** SignupRequest password. */
        public password: string;

        /**
         * Encodes the specified SignupRequest message. Does not implicitly {@link auth.SignupRequest.verify|verify} messages.
         * @param message SignupRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: auth.ISignupRequest, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SignupRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SignupRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): auth.SignupRequest;

        /**
         * Creates a SignupRequest message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SignupRequest
         */
        public static fromObject(object: { [k: string]: any }): auth.SignupRequest;

        /**
         * Creates a plain object from a SignupRequest message. Also converts values to other types if specified.
         * @param message SignupRequest
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: auth.SignupRequest, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SignupRequest to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SignupRequest
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of an AuthSuccess. */
    interface IAuthSuccess {

        /** AuthSuccess userId */
        userId?: (string|null);

        /** AuthSuccess accessToken */
        accessToken?: (string|null);

        /** AuthSuccess refreshToken */
        refreshToken?: (string|null);

        /** AuthSuccess expiresAt */
        expiresAt?: (Long|null);
    }

    /** Represents an AuthSuccess. */
    class AuthSuccess implements IAuthSuccess {

        /**
         * Constructs a new AuthSuccess.
         * @param [properties] Properties to set
         */
        constructor(properties?: auth.IAuthSuccess);

        /** AuthSuccess userId. */
        public userId: string;

        /** AuthSuccess accessToken. */
        public accessToken: string;

        /** AuthSuccess refreshToken. */
        public refreshToken: string;

        /** AuthSuccess expiresAt. */
        public expiresAt: Long;

        /**
         * Encodes the specified AuthSuccess message. Does not implicitly {@link auth.AuthSuccess.verify|verify} messages.
         * @param message AuthSuccess message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: auth.IAuthSuccess, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AuthSuccess message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AuthSuccess
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): auth.AuthSuccess;

        /**
         * Creates an AuthSuccess message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AuthSuccess
         */
        public static fromObject(object: { [k: string]: any }): auth.AuthSuccess;

        /**
         * Creates a plain object from an AuthSuccess message. Also converts values to other types if specified.
         * @param message AuthSuccess
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: auth.AuthSuccess, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AuthSuccess to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for AuthSuccess
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** AuthErrorCode enum. */
    enum AuthErrorCode {
        USERNAME_MALFORMED = 0,
        WEAK_PASSWORD = 1,
        INVALID_CREDENTIALS = 2,
        USERNAME_ALREADY_EXISTS = 3,
        TOKEN_EXPIRED = 4,
        UNAUTHORIZED = 5
    }

    /** Properties of an AuthError. */
    interface IAuthError {

        /** AuthError code */
        code?: (auth.AuthErrorCode|null);

        /** AuthError message */
        message?: (string|null);
    }

    /** Represents an AuthError. */
    class AuthError implements IAuthError {

        /**
         * Constructs a new AuthError.
         * @param [properties] Properties to set
         */
        constructor(properties?: auth.IAuthError);

        /** AuthError code. */
        public code: auth.AuthErrorCode;

        /** AuthError message. */
        public message: string;

        /**
         * Encodes the specified AuthError message. Does not implicitly {@link auth.AuthError.verify|verify} messages.
         * @param message AuthError message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: auth.IAuthError, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AuthError message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AuthError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): auth.AuthError;

        /**
         * Creates an AuthError message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AuthError
         */
        public static fromObject(object: { [k: string]: any }): auth.AuthError;

        /**
         * Creates a plain object from an AuthError message. Also converts values to other types if specified.
         * @param message AuthError
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: auth.AuthError, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AuthError to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for AuthError
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}

/** Namespace scripts. */
export namespace scripts {

    /** Properties of a Script. */
    interface IScript {

        /** Script uuid */
        uuid?: (string|null);

        /** Script name */
        name?: (string|null);

        /** Script divisions */
        divisions?: (scripts.IDivision[]|null);
    }

    /** Represents a Script. */
    class Script implements IScript {

        /**
         * Constructs a new Script.
         * @param [properties] Properties to set
         */
        constructor(properties?: scripts.IScript);

        /** Script uuid. */
        public uuid: string;

        /** Script name. */
        public name: string;

        /** Script divisions. */
        public divisions: scripts.IDivision[];

        /**
         * Encodes the specified Script message. Does not implicitly {@link scripts.Script.verify|verify} messages.
         * @param message Script message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: scripts.IScript, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Script message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Script
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): scripts.Script;

        /**
         * Creates a Script message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Script
         */
        public static fromObject(object: { [k: string]: any }): scripts.Script;

        /**
         * Creates a plain object from a Script message. Also converts values to other types if specified.
         * @param message Script
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: scripts.Script, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Script to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Script
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Division. */
    interface IDivision {

        /** Division uuid */
        uuid?: (string|null);

        /** Division name */
        name?: (string|null);

        /** Division previousTotals */
        previousTotals?: (number[]|null);

        /** Division textCues */
        textCues?: (scripts.ITextCuePair[]|null);
    }

    /** Represents a Division. */
    class Division implements IDivision {

        /**
         * Constructs a new Division.
         * @param [properties] Properties to set
         */
        constructor(properties?: scripts.IDivision);

        /** Division uuid. */
        public uuid: string;

        /** Division name. */
        public name: string;

        /** Division previousTotals. */
        public previousTotals: number[];

        /** Division textCues. */
        public textCues: scripts.ITextCuePair[];

        /**
         * Encodes the specified Division message. Does not implicitly {@link scripts.Division.verify|verify} messages.
         * @param message Division message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: scripts.IDivision, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Division message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Division
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): scripts.Division;

        /**
         * Creates a Division message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Division
         */
        public static fromObject(object: { [k: string]: any }): scripts.Division;

        /**
         * Creates a plain object from a Division message. Also converts values to other types if specified.
         * @param message Division
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: scripts.Division, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Division to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Division
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TextCuePair. */
    interface ITextCuePair {

        /** TextCuePair request */
        request?: (scripts.ITextCue|null);

        /** TextCuePair response */
        response?: (scripts.ITextCue|null);

        /** TextCuePair previousScores */
        previousScores?: (number[]|null);
    }

    /** Represents a TextCuePair. */
    class TextCuePair implements ITextCuePair {

        /**
         * Constructs a new TextCuePair.
         * @param [properties] Properties to set
         */
        constructor(properties?: scripts.ITextCuePair);

        /** TextCuePair request. */
        public request?: (scripts.ITextCue|null);

        /** TextCuePair response. */
        public response?: (scripts.ITextCue|null);

        /** TextCuePair previousScores. */
        public previousScores: number[];

        /** TextCuePair _request. */
        public _request?: "request";

        /**
         * Encodes the specified TextCuePair message. Does not implicitly {@link scripts.TextCuePair.verify|verify} messages.
         * @param message TextCuePair message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: scripts.ITextCuePair, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TextCuePair message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TextCuePair
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): scripts.TextCuePair;

        /**
         * Creates a TextCuePair message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TextCuePair
         */
        public static fromObject(object: { [k: string]: any }): scripts.TextCuePair;

        /**
         * Creates a plain object from a TextCuePair message. Also converts values to other types if specified.
         * @param message TextCuePair
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: scripts.TextCuePair, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TextCuePair to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TextCuePair
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a TextCue. */
    interface ITextCue {

        /** TextCue actor */
        actor?: (string|null);

        /** TextCue text */
        text?: (string|null);
    }

    /** Represents a TextCue. */
    class TextCue implements ITextCue {

        /**
         * Constructs a new TextCue.
         * @param [properties] Properties to set
         */
        constructor(properties?: scripts.ITextCue);

        /** TextCue actor. */
        public actor?: (string|null);

        /** TextCue text. */
        public text: string;

        /** TextCue _actor. */
        public _actor?: "actor";

        /**
         * Encodes the specified TextCue message. Does not implicitly {@link scripts.TextCue.verify|verify} messages.
         * @param message TextCue message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: scripts.ITextCue, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TextCue message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TextCue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): scripts.TextCue;

        /**
         * Creates a TextCue message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TextCue
         */
        public static fromObject(object: { [k: string]: any }): scripts.TextCue;

        /**
         * Creates a plain object from a TextCue message. Also converts values to other types if specified.
         * @param message TextCue
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: scripts.TextCue, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TextCue to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TextCue
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
