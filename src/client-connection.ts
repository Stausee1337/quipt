import { DialogManager } from "./dialog";
import { Observable } from "./observable";

export type ClientType = {
    info: string,
    uuid: string,
    logged_in_at: number,
    location: string,
    hex_token: string
};

export type ResponseType = {
    id: number,
    status: "error"|"success",
    body: any
};

type NicePromise<T> = Promise<T> & {
    resolve(data: T): void,
    resolved: boolean
};

function createNicePromise<T>(): NicePromise<T> {
    let resolveFn: (d: T) => void = undefined!;
    const rv: NicePromise<T> = <any>new Promise(resolve => {
        resolveFn = resolve;
    })
    rv.resolve = resolveFn;
    rv.resolved = false;
    rv.then(() => rv.resolved = true);
    return rv;
}

export class ClientConnection {
    private static readonly protocol = "ws" + location.protocol.substring(4);
    private static readonly websocketURL = `${ClientConnection.protocol}//${location.host}/api/client-connection`;

    
    private _messageId = 1;
    private readonly opened = createNicePromise<void>();
    private readonly websocket = new WebSocket(ClientConnection.websocketURL);
    
    constructor() {
        this.initialize();
    }

    private async initialize() {
        this.websocket.addEventListener("open", async () => {
            const np = createNicePromise<ResponseType>();
            const handler = (event: MessageEvent) => this.messageReceived(event, 0, np);
            this.websocket.addEventListener("message", handler);
            await np;
            console.info('Client Connection: Received NULL message');
            this.websocket.removeEventListener("message", handler);
            this.opened.resolve();
        });
        this.websocket.addEventListener("message", event => 
            this.messageReceived(event, null, null)
        );
        this.websocket.addEventListener("error", event => {
            console.error('Websocket error: ', event);
        })
    }

    public async listClients(): Promise<ClientType[]> {
        return await this.sendReceiveMessage<ClientType[]>("list-clients");
    }

    public async verifyToken(token: string): Promise<ClientType|null> {
        try {
            return await this.sendReceiveMessage("verify-token", token, false);
        } catch {
            return null;
        }
    }

    public async acceptToken(token: string): Promise<void> {
        await this.sendReceiveMessage("accept-token", token);
    }

    public async dismissToken(token: string): Promise<void> {
        await this.sendReceiveMessage("dismiss-token", token);
    }

    public async removeClient(uuid: string): Promise<void> {
        await this.sendReceiveMessage("remove-client", uuid);
    }

    private async sendReceiveMessage<T>(messageType: string, body: any = undefined, handleError = true): Promise<T> {
        if (!this.opened.resolved) {
            await this.opened;
        }
        const message = {
            id: this._messageId++,
            type: messageType,
        };
        if (body !== undefined) {
            message.body = body;
        }

        this.websocket.send(JSON.stringify(message));

        const promise = createNicePromise<ResponseType>();
        const messageListener = (event: MessageEvent) => this.messageReceived(event, this._messageId - 1, promise);
        this.websocket.addEventListener("message", messageListener)
        const data = await promise;
        this.websocket.removeEventListener("message", messageListener);
        console.log(data.status, data.status === "success")
        if (data.status === "success") {
            return data.body;
        }
        const errorMessage = `The server responded with an error: ${data.body.toString()}`;
        if (handleError) {
            DialogManager.openDialog({
                heading: "Fatal Error",
                description: errorMessage,
                dialogButtons: [],
            })
        }
        throw errorMessage;
    }

    public close() {
        this.websocket.close();
    }

    private messageReceived(event: MessageEvent, id: number|null, promise: NicePromise<ResponseType>|null) {
        try {
            const message = <ResponseType>JSON.parse(event.data);
            if (message.id === id && promise !== null) {
                promise.resolve(message);
            } else if (promise === null && message.id === id) {
                console.log('Client Connection error handler', id, promise);
                const errorMessage = `The sever responed with an error: ${message.body.toString()}`;
                DialogManager.openDialog({
                    heading: "Fatal error",
                    description: errorMessage,
                    dialogButtons: []
                });
                throw errorMessage;
            }
        } catch (error) {
            DialogManager.openDialog({
                heading: "Fatal error",
                description: `Failed to parse WebSocket response: ${(<any>error).toString()}`,
                dialogButtons: []
            });
        }
    }
}

