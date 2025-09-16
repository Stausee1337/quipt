/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const auth = $root.auth = (() => {

    /**
     * Namespace auth.
     * @exports auth
     * @namespace
     */
    const auth = {};

    auth.User = (function() {

        /**
         * Properties of a User.
         * @memberof auth
         * @interface IUser
         * @property {string|null} [id] User id
         * @property {string|null} [email] User email
         * @property {boolean|null} [verified] User verified
         */

        /**
         * Constructs a new User.
         * @memberof auth
         * @classdesc Represents a User.
         * @implements IUser
         * @constructor
         * @param {auth.IUser=} [properties] Properties to set
         */
        function User(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * User id.
         * @member {string} id
         * @memberof auth.User
         * @instance
         */
        User.prototype.id = "";

        /**
         * User email.
         * @member {string} email
         * @memberof auth.User
         * @instance
         */
        User.prototype.email = "";

        /**
         * User verified.
         * @member {boolean} verified
         * @memberof auth.User
         * @instance
         */
        User.prototype.verified = false;

        /**
         * Encodes the specified User message. Does not implicitly {@link auth.User.verify|verify} messages.
         * @function encode
         * @memberof auth.User
         * @static
         * @param {auth.IUser} message User message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        User.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.email != null && Object.hasOwnProperty.call(message, "email"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.email);
            if (message.verified != null && Object.hasOwnProperty.call(message, "verified"))
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.verified);
            return writer;
        };

        /**
         * Decodes a User message from the specified reader or buffer.
         * @function decode
         * @memberof auth.User
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {auth.User} User
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        User.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.auth.User();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.email = reader.string();
                        break;
                    }
                case 3: {
                        message.verified = reader.bool();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Creates a User message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof auth.User
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {auth.User} User
         */
        User.fromObject = function fromObject(object) {
            if (object instanceof $root.auth.User)
                return object;
            let message = new $root.auth.User();
            if (object.id != null)
                message.id = String(object.id);
            if (object.email != null)
                message.email = String(object.email);
            if (object.verified != null)
                message.verified = Boolean(object.verified);
            return message;
        };

        /**
         * Creates a plain object from a User message. Also converts values to other types if specified.
         * @function toObject
         * @memberof auth.User
         * @static
         * @param {auth.User} message User
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        User.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.email = "";
                object.verified = false;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.email != null && message.hasOwnProperty("email"))
                object.email = message.email;
            if (message.verified != null && message.hasOwnProperty("verified"))
                object.verified = message.verified;
            return object;
        };

        /**
         * Converts this User to JSON.
         * @function toJSON
         * @memberof auth.User
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        User.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for User
         * @function getTypeUrl
         * @memberof auth.User
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        User.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/auth.User";
        };

        return User;
    })();

    auth.SigninRequest = (function() {

        /**
         * Properties of a SigninRequest.
         * @memberof auth
         * @interface ISigninRequest
         * @property {string|null} [email] SigninRequest email
         * @property {string|null} [password] SigninRequest password
         */

        /**
         * Constructs a new SigninRequest.
         * @memberof auth
         * @classdesc Represents a SigninRequest.
         * @implements ISigninRequest
         * @constructor
         * @param {auth.ISigninRequest=} [properties] Properties to set
         */
        function SigninRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SigninRequest email.
         * @member {string} email
         * @memberof auth.SigninRequest
         * @instance
         */
        SigninRequest.prototype.email = "";

        /**
         * SigninRequest password.
         * @member {string} password
         * @memberof auth.SigninRequest
         * @instance
         */
        SigninRequest.prototype.password = "";

        /**
         * Encodes the specified SigninRequest message. Does not implicitly {@link auth.SigninRequest.verify|verify} messages.
         * @function encode
         * @memberof auth.SigninRequest
         * @static
         * @param {auth.ISigninRequest} message SigninRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SigninRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.email != null && Object.hasOwnProperty.call(message, "email"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.email);
            if (message.password != null && Object.hasOwnProperty.call(message, "password"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.password);
            return writer;
        };

        /**
         * Decodes a SigninRequest message from the specified reader or buffer.
         * @function decode
         * @memberof auth.SigninRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {auth.SigninRequest} SigninRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SigninRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.auth.SigninRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.email = reader.string();
                        break;
                    }
                case 2: {
                        message.password = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Creates a SigninRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof auth.SigninRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {auth.SigninRequest} SigninRequest
         */
        SigninRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.auth.SigninRequest)
                return object;
            let message = new $root.auth.SigninRequest();
            if (object.email != null)
                message.email = String(object.email);
            if (object.password != null)
                message.password = String(object.password);
            return message;
        };

        /**
         * Creates a plain object from a SigninRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof auth.SigninRequest
         * @static
         * @param {auth.SigninRequest} message SigninRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SigninRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.email = "";
                object.password = "";
            }
            if (message.email != null && message.hasOwnProperty("email"))
                object.email = message.email;
            if (message.password != null && message.hasOwnProperty("password"))
                object.password = message.password;
            return object;
        };

        /**
         * Converts this SigninRequest to JSON.
         * @function toJSON
         * @memberof auth.SigninRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SigninRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SigninRequest
         * @function getTypeUrl
         * @memberof auth.SigninRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SigninRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/auth.SigninRequest";
        };

        return SigninRequest;
    })();

    auth.SignupRequest = (function() {

        /**
         * Properties of a SignupRequest.
         * @memberof auth
         * @interface ISignupRequest
         * @property {string|null} [email] SignupRequest email
         * @property {string|null} [password] SignupRequest password
         */

        /**
         * Constructs a new SignupRequest.
         * @memberof auth
         * @classdesc Represents a SignupRequest.
         * @implements ISignupRequest
         * @constructor
         * @param {auth.ISignupRequest=} [properties] Properties to set
         */
        function SignupRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SignupRequest email.
         * @member {string} email
         * @memberof auth.SignupRequest
         * @instance
         */
        SignupRequest.prototype.email = "";

        /**
         * SignupRequest password.
         * @member {string} password
         * @memberof auth.SignupRequest
         * @instance
         */
        SignupRequest.prototype.password = "";

        /**
         * Encodes the specified SignupRequest message. Does not implicitly {@link auth.SignupRequest.verify|verify} messages.
         * @function encode
         * @memberof auth.SignupRequest
         * @static
         * @param {auth.ISignupRequest} message SignupRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SignupRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.email != null && Object.hasOwnProperty.call(message, "email"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.email);
            if (message.password != null && Object.hasOwnProperty.call(message, "password"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.password);
            return writer;
        };

        /**
         * Decodes a SignupRequest message from the specified reader or buffer.
         * @function decode
         * @memberof auth.SignupRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {auth.SignupRequest} SignupRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SignupRequest.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.auth.SignupRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.email = reader.string();
                        break;
                    }
                case 2: {
                        message.password = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Creates a SignupRequest message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof auth.SignupRequest
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {auth.SignupRequest} SignupRequest
         */
        SignupRequest.fromObject = function fromObject(object) {
            if (object instanceof $root.auth.SignupRequest)
                return object;
            let message = new $root.auth.SignupRequest();
            if (object.email != null)
                message.email = String(object.email);
            if (object.password != null)
                message.password = String(object.password);
            return message;
        };

        /**
         * Creates a plain object from a SignupRequest message. Also converts values to other types if specified.
         * @function toObject
         * @memberof auth.SignupRequest
         * @static
         * @param {auth.SignupRequest} message SignupRequest
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SignupRequest.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.email = "";
                object.password = "";
            }
            if (message.email != null && message.hasOwnProperty("email"))
                object.email = message.email;
            if (message.password != null && message.hasOwnProperty("password"))
                object.password = message.password;
            return object;
        };

        /**
         * Converts this SignupRequest to JSON.
         * @function toJSON
         * @memberof auth.SignupRequest
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SignupRequest.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SignupRequest
         * @function getTypeUrl
         * @memberof auth.SignupRequest
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SignupRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/auth.SignupRequest";
        };

        return SignupRequest;
    })();

    auth.AuthSuccess = (function() {

        /**
         * Properties of an AuthSuccess.
         * @memberof auth
         * @interface IAuthSuccess
         * @property {string|null} [userId] AuthSuccess userId
         * @property {string|null} [accessToken] AuthSuccess accessToken
         * @property {string|null} [refreshToken] AuthSuccess refreshToken
         * @property {Long|null} [expiresAt] AuthSuccess expiresAt
         */

        /**
         * Constructs a new AuthSuccess.
         * @memberof auth
         * @classdesc Represents an AuthSuccess.
         * @implements IAuthSuccess
         * @constructor
         * @param {auth.IAuthSuccess=} [properties] Properties to set
         */
        function AuthSuccess(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * AuthSuccess userId.
         * @member {string} userId
         * @memberof auth.AuthSuccess
         * @instance
         */
        AuthSuccess.prototype.userId = "";

        /**
         * AuthSuccess accessToken.
         * @member {string} accessToken
         * @memberof auth.AuthSuccess
         * @instance
         */
        AuthSuccess.prototype.accessToken = "";

        /**
         * AuthSuccess refreshToken.
         * @member {string} refreshToken
         * @memberof auth.AuthSuccess
         * @instance
         */
        AuthSuccess.prototype.refreshToken = "";

        /**
         * AuthSuccess expiresAt.
         * @member {Long} expiresAt
         * @memberof auth.AuthSuccess
         * @instance
         */
        AuthSuccess.prototype.expiresAt = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Encodes the specified AuthSuccess message. Does not implicitly {@link auth.AuthSuccess.verify|verify} messages.
         * @function encode
         * @memberof auth.AuthSuccess
         * @static
         * @param {auth.IAuthSuccess} message AuthSuccess message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AuthSuccess.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.userId != null && Object.hasOwnProperty.call(message, "userId"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.userId);
            if (message.accessToken != null && Object.hasOwnProperty.call(message, "accessToken"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.accessToken);
            if (message.refreshToken != null && Object.hasOwnProperty.call(message, "refreshToken"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.refreshToken);
            if (message.expiresAt != null && Object.hasOwnProperty.call(message, "expiresAt"))
                writer.uint32(/* id 4, wireType 0 =*/32).int64(message.expiresAt);
            return writer;
        };

        /**
         * Decodes an AuthSuccess message from the specified reader or buffer.
         * @function decode
         * @memberof auth.AuthSuccess
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {auth.AuthSuccess} AuthSuccess
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AuthSuccess.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.auth.AuthSuccess();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.userId = reader.string();
                        break;
                    }
                case 2: {
                        message.accessToken = reader.string();
                        break;
                    }
                case 3: {
                        message.refreshToken = reader.string();
                        break;
                    }
                case 4: {
                        message.expiresAt = reader.int64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Creates an AuthSuccess message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof auth.AuthSuccess
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {auth.AuthSuccess} AuthSuccess
         */
        AuthSuccess.fromObject = function fromObject(object) {
            if (object instanceof $root.auth.AuthSuccess)
                return object;
            let message = new $root.auth.AuthSuccess();
            if (object.userId != null)
                message.userId = String(object.userId);
            if (object.accessToken != null)
                message.accessToken = String(object.accessToken);
            if (object.refreshToken != null)
                message.refreshToken = String(object.refreshToken);
            if (object.expiresAt != null)
                if ($util.Long)
                    (message.expiresAt = $util.Long.fromValue(object.expiresAt)).unsigned = false;
                else if (typeof object.expiresAt === "string")
                    message.expiresAt = parseInt(object.expiresAt, 10);
                else if (typeof object.expiresAt === "number")
                    message.expiresAt = object.expiresAt;
                else if (typeof object.expiresAt === "object")
                    message.expiresAt = new $util.LongBits(object.expiresAt.low >>> 0, object.expiresAt.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from an AuthSuccess message. Also converts values to other types if specified.
         * @function toObject
         * @memberof auth.AuthSuccess
         * @static
         * @param {auth.AuthSuccess} message AuthSuccess
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AuthSuccess.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.userId = "";
                object.accessToken = "";
                object.refreshToken = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.expiresAt = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.expiresAt = options.longs === String ? "0" : 0;
            }
            if (message.userId != null && message.hasOwnProperty("userId"))
                object.userId = message.userId;
            if (message.accessToken != null && message.hasOwnProperty("accessToken"))
                object.accessToken = message.accessToken;
            if (message.refreshToken != null && message.hasOwnProperty("refreshToken"))
                object.refreshToken = message.refreshToken;
            if (message.expiresAt != null && message.hasOwnProperty("expiresAt"))
                if (typeof message.expiresAt === "number")
                    object.expiresAt = options.longs === String ? String(message.expiresAt) : message.expiresAt;
                else
                    object.expiresAt = options.longs === String ? $util.Long.prototype.toString.call(message.expiresAt) : options.longs === Number ? new $util.LongBits(message.expiresAt.low >>> 0, message.expiresAt.high >>> 0).toNumber() : message.expiresAt;
            return object;
        };

        /**
         * Converts this AuthSuccess to JSON.
         * @function toJSON
         * @memberof auth.AuthSuccess
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AuthSuccess.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AuthSuccess
         * @function getTypeUrl
         * @memberof auth.AuthSuccess
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AuthSuccess.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/auth.AuthSuccess";
        };

        return AuthSuccess;
    })();

    /**
     * AuthErrorCode enum.
     * @name auth.AuthErrorCode
     * @enum {number}
     * @property {number} EMAIL_MALFORMED=0 EMAIL_MALFORMED value
     * @property {number} WEAK_PASSWORD=1 WEAK_PASSWORD value
     * @property {number} INVALID_CREDENTIALS=2 INVALID_CREDENTIALS value
     * @property {number} EMAIL_ALREADY_EXISTS=3 EMAIL_ALREADY_EXISTS value
     * @property {number} TOKEN_EXPIRED=4 TOKEN_EXPIRED value
     * @property {number} UNAUTHORIZED=5 UNAUTHORIZED value
     */
    auth.AuthErrorCode = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "EMAIL_MALFORMED"] = 0;
        values[valuesById[1] = "WEAK_PASSWORD"] = 1;
        values[valuesById[2] = "INVALID_CREDENTIALS"] = 2;
        values[valuesById[3] = "EMAIL_ALREADY_EXISTS"] = 3;
        values[valuesById[4] = "TOKEN_EXPIRED"] = 4;
        values[valuesById[5] = "UNAUTHORIZED"] = 5;
        return values;
    })();

    auth.AuthError = (function() {

        /**
         * Properties of an AuthError.
         * @memberof auth
         * @interface IAuthError
         * @property {auth.AuthErrorCode|null} [code] AuthError code
         * @property {string|null} [message] AuthError message
         */

        /**
         * Constructs a new AuthError.
         * @memberof auth
         * @classdesc Represents an AuthError.
         * @implements IAuthError
         * @constructor
         * @param {auth.IAuthError=} [properties] Properties to set
         */
        function AuthError(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * AuthError code.
         * @member {auth.AuthErrorCode} code
         * @memberof auth.AuthError
         * @instance
         */
        AuthError.prototype.code = 0;

        /**
         * AuthError message.
         * @member {string} message
         * @memberof auth.AuthError
         * @instance
         */
        AuthError.prototype.message = "";

        /**
         * Encodes the specified AuthError message. Does not implicitly {@link auth.AuthError.verify|verify} messages.
         * @function encode
         * @memberof auth.AuthError
         * @static
         * @param {auth.IAuthError} message AuthError message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AuthError.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.code);
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
            return writer;
        };

        /**
         * Decodes an AuthError message from the specified reader or buffer.
         * @function decode
         * @memberof auth.AuthError
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {auth.AuthError} AuthError
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AuthError.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.auth.AuthError();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.code = reader.int32();
                        break;
                    }
                case 2: {
                        message.message = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Creates an AuthError message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof auth.AuthError
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {auth.AuthError} AuthError
         */
        AuthError.fromObject = function fromObject(object) {
            if (object instanceof $root.auth.AuthError)
                return object;
            let message = new $root.auth.AuthError();
            switch (object.code) {
            default:
                if (typeof object.code === "number") {
                    message.code = object.code;
                    break;
                }
                break;
            case "EMAIL_MALFORMED":
            case 0:
                message.code = 0;
                break;
            case "WEAK_PASSWORD":
            case 1:
                message.code = 1;
                break;
            case "INVALID_CREDENTIALS":
            case 2:
                message.code = 2;
                break;
            case "EMAIL_ALREADY_EXISTS":
            case 3:
                message.code = 3;
                break;
            case "TOKEN_EXPIRED":
            case 4:
                message.code = 4;
                break;
            case "UNAUTHORIZED":
            case 5:
                message.code = 5;
                break;
            }
            if (object.message != null)
                message.message = String(object.message);
            return message;
        };

        /**
         * Creates a plain object from an AuthError message. Also converts values to other types if specified.
         * @function toObject
         * @memberof auth.AuthError
         * @static
         * @param {auth.AuthError} message AuthError
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AuthError.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.code = options.enums === String ? "EMAIL_MALFORMED" : 0;
                object.message = "";
            }
            if (message.code != null && message.hasOwnProperty("code"))
                object.code = options.enums === String ? $root.auth.AuthErrorCode[message.code] === undefined ? message.code : $root.auth.AuthErrorCode[message.code] : message.code;
            if (message.message != null && message.hasOwnProperty("message"))
                object.message = message.message;
            return object;
        };

        /**
         * Converts this AuthError to JSON.
         * @function toJSON
         * @memberof auth.AuthError
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AuthError.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AuthError
         * @function getTypeUrl
         * @memberof auth.AuthError
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AuthError.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/auth.AuthError";
        };

        return AuthError;
    })();

    return auth;
})();

export const scripts = $root.scripts = (() => {

    /**
     * Namespace scripts.
     * @exports scripts
     * @namespace
     */
    const scripts = {};

    scripts.Script = (function() {

        /**
         * Properties of a Script.
         * @memberof scripts
         * @interface IScript
         * @property {string|null} [uuid] Script uuid
         * @property {string|null} [name] Script name
         * @property {Array.<scripts.IDivision>|null} [divisions] Script divisions
         */

        /**
         * Constructs a new Script.
         * @memberof scripts
         * @classdesc Represents a Script.
         * @implements IScript
         * @constructor
         * @param {scripts.IScript=} [properties] Properties to set
         */
        function Script(properties) {
            this.divisions = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Script uuid.
         * @member {string} uuid
         * @memberof scripts.Script
         * @instance
         */
        Script.prototype.uuid = "";

        /**
         * Script name.
         * @member {string} name
         * @memberof scripts.Script
         * @instance
         */
        Script.prototype.name = "";

        /**
         * Script divisions.
         * @member {Array.<scripts.IDivision>} divisions
         * @memberof scripts.Script
         * @instance
         */
        Script.prototype.divisions = $util.emptyArray;

        /**
         * Encodes the specified Script message. Does not implicitly {@link scripts.Script.verify|verify} messages.
         * @function encode
         * @memberof scripts.Script
         * @static
         * @param {scripts.IScript} message Script message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Script.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.uuid != null && Object.hasOwnProperty.call(message, "uuid"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.uuid);
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
            if (message.divisions != null && message.divisions.length)
                for (let i = 0; i < message.divisions.length; ++i)
                    $root.scripts.Division.encode(message.divisions[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a Script message from the specified reader or buffer.
         * @function decode
         * @memberof scripts.Script
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {scripts.Script} Script
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Script.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.scripts.Script();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.uuid = reader.string();
                        break;
                    }
                case 2: {
                        message.name = reader.string();
                        break;
                    }
                case 3: {
                        if (!(message.divisions && message.divisions.length))
                            message.divisions = [];
                        message.divisions.push($root.scripts.Division.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Creates a Script message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof scripts.Script
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {scripts.Script} Script
         */
        Script.fromObject = function fromObject(object) {
            if (object instanceof $root.scripts.Script)
                return object;
            let message = new $root.scripts.Script();
            if (object.uuid != null)
                message.uuid = String(object.uuid);
            if (object.name != null)
                message.name = String(object.name);
            if (object.divisions) {
                if (!Array.isArray(object.divisions))
                    throw TypeError(".scripts.Script.divisions: array expected");
                message.divisions = [];
                for (let i = 0; i < object.divisions.length; ++i) {
                    if (typeof object.divisions[i] !== "object")
                        throw TypeError(".scripts.Script.divisions: object expected");
                    message.divisions[i] = $root.scripts.Division.fromObject(object.divisions[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a Script message. Also converts values to other types if specified.
         * @function toObject
         * @memberof scripts.Script
         * @static
         * @param {scripts.Script} message Script
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Script.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.divisions = [];
            if (options.defaults) {
                object.uuid = "";
                object.name = "";
            }
            if (message.uuid != null && message.hasOwnProperty("uuid"))
                object.uuid = message.uuid;
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.divisions && message.divisions.length) {
                object.divisions = [];
                for (let j = 0; j < message.divisions.length; ++j)
                    object.divisions[j] = $root.scripts.Division.toObject(message.divisions[j], options);
            }
            return object;
        };

        /**
         * Converts this Script to JSON.
         * @function toJSON
         * @memberof scripts.Script
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Script.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Script
         * @function getTypeUrl
         * @memberof scripts.Script
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Script.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/scripts.Script";
        };

        return Script;
    })();

    scripts.Division = (function() {

        /**
         * Properties of a Division.
         * @memberof scripts
         * @interface IDivision
         * @property {string|null} [uuid] Division uuid
         * @property {string|null} [name] Division name
         * @property {Array.<number>|null} [previousTotals] Division previousTotals
         * @property {Array.<scripts.ITextCuePair>|null} [textCues] Division textCues
         */

        /**
         * Constructs a new Division.
         * @memberof scripts
         * @classdesc Represents a Division.
         * @implements IDivision
         * @constructor
         * @param {scripts.IDivision=} [properties] Properties to set
         */
        function Division(properties) {
            this.previousTotals = [];
            this.textCues = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Division uuid.
         * @member {string} uuid
         * @memberof scripts.Division
         * @instance
         */
        Division.prototype.uuid = "";

        /**
         * Division name.
         * @member {string} name
         * @memberof scripts.Division
         * @instance
         */
        Division.prototype.name = "";

        /**
         * Division previousTotals.
         * @member {Array.<number>} previousTotals
         * @memberof scripts.Division
         * @instance
         */
        Division.prototype.previousTotals = $util.emptyArray;

        /**
         * Division textCues.
         * @member {Array.<scripts.ITextCuePair>} textCues
         * @memberof scripts.Division
         * @instance
         */
        Division.prototype.textCues = $util.emptyArray;

        /**
         * Encodes the specified Division message. Does not implicitly {@link scripts.Division.verify|verify} messages.
         * @function encode
         * @memberof scripts.Division
         * @static
         * @param {scripts.IDivision} message Division message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Division.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.uuid != null && Object.hasOwnProperty.call(message, "uuid"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.uuid);
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
            if (message.previousTotals != null && message.previousTotals.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (let i = 0; i < message.previousTotals.length; ++i)
                    writer.uint32(message.previousTotals[i]);
                writer.ldelim();
            }
            if (message.textCues != null && message.textCues.length)
                for (let i = 0; i < message.textCues.length; ++i)
                    $root.scripts.TextCuePair.encode(message.textCues[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a Division message from the specified reader or buffer.
         * @function decode
         * @memberof scripts.Division
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {scripts.Division} Division
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Division.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.scripts.Division();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.uuid = reader.string();
                        break;
                    }
                case 2: {
                        message.name = reader.string();
                        break;
                    }
                case 3: {
                        if (!(message.previousTotals && message.previousTotals.length))
                            message.previousTotals = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.previousTotals.push(reader.uint32());
                        } else
                            message.previousTotals.push(reader.uint32());
                        break;
                    }
                case 4: {
                        if (!(message.textCues && message.textCues.length))
                            message.textCues = [];
                        message.textCues.push($root.scripts.TextCuePair.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Creates a Division message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof scripts.Division
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {scripts.Division} Division
         */
        Division.fromObject = function fromObject(object) {
            if (object instanceof $root.scripts.Division)
                return object;
            let message = new $root.scripts.Division();
            if (object.uuid != null)
                message.uuid = String(object.uuid);
            if (object.name != null)
                message.name = String(object.name);
            if (object.previousTotals) {
                if (!Array.isArray(object.previousTotals))
                    throw TypeError(".scripts.Division.previousTotals: array expected");
                message.previousTotals = [];
                for (let i = 0; i < object.previousTotals.length; ++i)
                    message.previousTotals[i] = object.previousTotals[i] >>> 0;
            }
            if (object.textCues) {
                if (!Array.isArray(object.textCues))
                    throw TypeError(".scripts.Division.textCues: array expected");
                message.textCues = [];
                for (let i = 0; i < object.textCues.length; ++i) {
                    if (typeof object.textCues[i] !== "object")
                        throw TypeError(".scripts.Division.textCues: object expected");
                    message.textCues[i] = $root.scripts.TextCuePair.fromObject(object.textCues[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a Division message. Also converts values to other types if specified.
         * @function toObject
         * @memberof scripts.Division
         * @static
         * @param {scripts.Division} message Division
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Division.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.previousTotals = [];
                object.textCues = [];
            }
            if (options.defaults) {
                object.uuid = "";
                object.name = "";
            }
            if (message.uuid != null && message.hasOwnProperty("uuid"))
                object.uuid = message.uuid;
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.previousTotals && message.previousTotals.length) {
                object.previousTotals = [];
                for (let j = 0; j < message.previousTotals.length; ++j)
                    object.previousTotals[j] = message.previousTotals[j];
            }
            if (message.textCues && message.textCues.length) {
                object.textCues = [];
                for (let j = 0; j < message.textCues.length; ++j)
                    object.textCues[j] = $root.scripts.TextCuePair.toObject(message.textCues[j], options);
            }
            return object;
        };

        /**
         * Converts this Division to JSON.
         * @function toJSON
         * @memberof scripts.Division
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Division.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Division
         * @function getTypeUrl
         * @memberof scripts.Division
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Division.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/scripts.Division";
        };

        return Division;
    })();

    scripts.TextCuePair = (function() {

        /**
         * Properties of a TextCuePair.
         * @memberof scripts
         * @interface ITextCuePair
         * @property {scripts.ITextCue|null} [request] TextCuePair request
         * @property {scripts.ITextCue|null} [response] TextCuePair response
         * @property {Array.<number>|null} [previousScores] TextCuePair previousScores
         */

        /**
         * Constructs a new TextCuePair.
         * @memberof scripts
         * @classdesc Represents a TextCuePair.
         * @implements ITextCuePair
         * @constructor
         * @param {scripts.ITextCuePair=} [properties] Properties to set
         */
        function TextCuePair(properties) {
            this.previousScores = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TextCuePair request.
         * @member {scripts.ITextCue|null|undefined} request
         * @memberof scripts.TextCuePair
         * @instance
         */
        TextCuePair.prototype.request = null;

        /**
         * TextCuePair response.
         * @member {scripts.ITextCue|null|undefined} response
         * @memberof scripts.TextCuePair
         * @instance
         */
        TextCuePair.prototype.response = null;

        /**
         * TextCuePair previousScores.
         * @member {Array.<number>} previousScores
         * @memberof scripts.TextCuePair
         * @instance
         */
        TextCuePair.prototype.previousScores = $util.emptyArray;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * TextCuePair _request.
         * @member {"request"|undefined} _request
         * @memberof scripts.TextCuePair
         * @instance
         */
        Object.defineProperty(TextCuePair.prototype, "_request", {
            get: $util.oneOfGetter($oneOfFields = ["request"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified TextCuePair message. Does not implicitly {@link scripts.TextCuePair.verify|verify} messages.
         * @function encode
         * @memberof scripts.TextCuePair
         * @static
         * @param {scripts.ITextCuePair} message TextCuePair message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TextCuePair.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.request != null && Object.hasOwnProperty.call(message, "request"))
                $root.scripts.TextCue.encode(message.request, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.response != null && Object.hasOwnProperty.call(message, "response"))
                $root.scripts.TextCue.encode(message.response, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.previousScores != null && message.previousScores.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (let i = 0; i < message.previousScores.length; ++i)
                    writer.uint32(message.previousScores[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Decodes a TextCuePair message from the specified reader or buffer.
         * @function decode
         * @memberof scripts.TextCuePair
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {scripts.TextCuePair} TextCuePair
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TextCuePair.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.scripts.TextCuePair();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.request = $root.scripts.TextCue.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.response = $root.scripts.TextCue.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        if (!(message.previousScores && message.previousScores.length))
                            message.previousScores = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.previousScores.push(reader.uint32());
                        } else
                            message.previousScores.push(reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Creates a TextCuePair message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof scripts.TextCuePair
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {scripts.TextCuePair} TextCuePair
         */
        TextCuePair.fromObject = function fromObject(object) {
            if (object instanceof $root.scripts.TextCuePair)
                return object;
            let message = new $root.scripts.TextCuePair();
            if (object.request != null) {
                if (typeof object.request !== "object")
                    throw TypeError(".scripts.TextCuePair.request: object expected");
                message.request = $root.scripts.TextCue.fromObject(object.request);
            }
            if (object.response != null) {
                if (typeof object.response !== "object")
                    throw TypeError(".scripts.TextCuePair.response: object expected");
                message.response = $root.scripts.TextCue.fromObject(object.response);
            }
            if (object.previousScores) {
                if (!Array.isArray(object.previousScores))
                    throw TypeError(".scripts.TextCuePair.previousScores: array expected");
                message.previousScores = [];
                for (let i = 0; i < object.previousScores.length; ++i)
                    message.previousScores[i] = object.previousScores[i] >>> 0;
            }
            return message;
        };

        /**
         * Creates a plain object from a TextCuePair message. Also converts values to other types if specified.
         * @function toObject
         * @memberof scripts.TextCuePair
         * @static
         * @param {scripts.TextCuePair} message TextCuePair
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TextCuePair.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults)
                object.previousScores = [];
            if (options.defaults)
                object.response = null;
            if (message.request != null && message.hasOwnProperty("request")) {
                object.request = $root.scripts.TextCue.toObject(message.request, options);
                if (options.oneofs)
                    object._request = "request";
            }
            if (message.response != null && message.hasOwnProperty("response"))
                object.response = $root.scripts.TextCue.toObject(message.response, options);
            if (message.previousScores && message.previousScores.length) {
                object.previousScores = [];
                for (let j = 0; j < message.previousScores.length; ++j)
                    object.previousScores[j] = message.previousScores[j];
            }
            return object;
        };

        /**
         * Converts this TextCuePair to JSON.
         * @function toJSON
         * @memberof scripts.TextCuePair
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TextCuePair.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TextCuePair
         * @function getTypeUrl
         * @memberof scripts.TextCuePair
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TextCuePair.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/scripts.TextCuePair";
        };

        return TextCuePair;
    })();

    scripts.TextCue = (function() {

        /**
         * Properties of a TextCue.
         * @memberof scripts
         * @interface ITextCue
         * @property {string|null} [actor] TextCue actor
         * @property {string|null} [text] TextCue text
         */

        /**
         * Constructs a new TextCue.
         * @memberof scripts
         * @classdesc Represents a TextCue.
         * @implements ITextCue
         * @constructor
         * @param {scripts.ITextCue=} [properties] Properties to set
         */
        function TextCue(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TextCue actor.
         * @member {string|null|undefined} actor
         * @memberof scripts.TextCue
         * @instance
         */
        TextCue.prototype.actor = null;

        /**
         * TextCue text.
         * @member {string} text
         * @memberof scripts.TextCue
         * @instance
         */
        TextCue.prototype.text = "";

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * TextCue _actor.
         * @member {"actor"|undefined} _actor
         * @memberof scripts.TextCue
         * @instance
         */
        Object.defineProperty(TextCue.prototype, "_actor", {
            get: $util.oneOfGetter($oneOfFields = ["actor"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified TextCue message. Does not implicitly {@link scripts.TextCue.verify|verify} messages.
         * @function encode
         * @memberof scripts.TextCue
         * @static
         * @param {scripts.ITextCue} message TextCue message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TextCue.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.actor != null && Object.hasOwnProperty.call(message, "actor"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.actor);
            if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.text);
            return writer;
        };

        /**
         * Decodes a TextCue message from the specified reader or buffer.
         * @function decode
         * @memberof scripts.TextCue
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {scripts.TextCue} TextCue
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TextCue.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.scripts.TextCue();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.actor = reader.string();
                        break;
                    }
                case 2: {
                        message.text = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Creates a TextCue message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof scripts.TextCue
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {scripts.TextCue} TextCue
         */
        TextCue.fromObject = function fromObject(object) {
            if (object instanceof $root.scripts.TextCue)
                return object;
            let message = new $root.scripts.TextCue();
            if (object.actor != null)
                message.actor = String(object.actor);
            if (object.text != null)
                message.text = String(object.text);
            return message;
        };

        /**
         * Creates a plain object from a TextCue message. Also converts values to other types if specified.
         * @function toObject
         * @memberof scripts.TextCue
         * @static
         * @param {scripts.TextCue} message TextCue
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TextCue.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults)
                object.text = "";
            if (message.actor != null && message.hasOwnProperty("actor")) {
                object.actor = message.actor;
                if (options.oneofs)
                    object._actor = "actor";
            }
            if (message.text != null && message.hasOwnProperty("text"))
                object.text = message.text;
            return object;
        };

        /**
         * Converts this TextCue to JSON.
         * @function toJSON
         * @memberof scripts.TextCue
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TextCue.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TextCue
         * @function getTypeUrl
         * @memberof scripts.TextCue
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TextCue.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/scripts.TextCue";
        };

        return TextCue;
    })();

    return scripts;
})();

export { $root as default };
