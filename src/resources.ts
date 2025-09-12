import { JSX } from "solid-js";
import { DialogManager } from "./dialog";
import { Observable } from "./observable";
import { PropertiesHyphen as CSSProperties } from 'csstype';
import { validate, stringify } from 'uuid';

function generateSunflowerColor(idx: number, saturation = 95, value = 70): string {
    const PHI = (5 ** 0.5 + 1) * 0.5;
	return `hsl(${((PHI * idx) % 1) * 360}deg, ${saturation}%, ${value}%)`;
}

const stringJSON = `[{"uuid":"12a4b830-4415-4c69-a2b8-69e595f33e2b","lastUpdated":1696622142,"name":"Test-Script","modifiedTime":1696622142,"actors":["Emil","Emily","Laura","Bär"],"table":[{"type":"division","name":"Akt 1"},{"type":"trigger","uuid":"b55f7d1a-ea1e-4758-8dcf-c5cc2d4908d2"},{"type":"division","name":"Akt 2"},{"type":"trigger","uuid":"1ac271bd-4c26-4490-ab0c-ec9b7c68a000"},{"type":"trigger","uuid":"828ee434-4fae-46ec-a61b-1ca57d191a17"},{"type":"trigger","uuid":"3a36b3b1-a736-42db-9504-73d4bdda4003"},{"type":"division","name":"Akt 3"},{"type":"trigger","uuid":"7dfbddc7-868b-4280-81fa-809b9010cc6b"},{"type":"trigger","uuid":"7c94e1fa-6457-4695-bc18-54b3a5641068"},{"type":"trigger","uuid":"7091af78-7be7-4340-85fd-b2d8c3c93476"},{"type":"trigger","uuid":"c8918989-d043-4722-b505-ff22d9ca8e77"}]}]`

export namespace ResourceManager {
    let database: IDBDatabase= null!;
    export let scriptsResource: ScriptsResource;

    export function getScripts() {
        // if (database === null) {
        //     await openDatabase()
        // }

        // const scriptStore = database.transaction(['Script'], 'readonly').objectStore('Script');
        // const request = scriptStore.getAll();
        // const result = await new Promise<any[]>((resolve, reject) => {
        //     request.onerror = _createErrorHandler('Error reading database', reject);
        //     request.onsuccess = () => resolve(request.result);
        // });
        
        const result = JSON.parse(stringJSON);
        const scripts = result.map(Script.fromDatabase)
        const lastUpdated = Number(localStorage.getItem('Scripts.lastUpdated') ?? '0');
        // scriptsResource = new ScriptsResource(scripts, lastUpdated);
        scriptsResource.lastUpdated = lastUpdated;
        scriptsResource.scripts.set(scripts);
    }

    export async function persistScript(script: Script): Promise<void> {
        if (database === null) {
            await openDatabase()
        }
        const scriptItem = script.mapToPersistable();

        await new Promise((resolve, reject) => {
            const transaction = database.transaction('Script', 'readwrite');
            transaction.oncomplete = resolve;
            transaction.onerror = _createErrorHandler('Error committing transaction', reject);

            const triggerStore = transaction.objectStore('Script');
            const cursorRequest = triggerStore.openCursor(script.uuid);

            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                let writeRequest;
                if (cursor !== null) {
                    writeRequest = cursor.update(scriptItem);
                } else {
                    writeRequest = triggerStore.add(scriptItem);
                }
                writeRequest.onerror = _createErrorHandler('Error writing database', reject);
            };
        });
    }

    export async function persistTrigger(trigger: Trigger): Promise<void> {
        if (database === null) {
            await openDatabase()
        }
        const triggerItem = trigger.mapToPersistable();

        await new Promise((resolve, reject) => {
            const transaction = database.transaction('Trigger', 'readwrite');
            transaction.oncomplete = resolve;
            transaction.onerror = _createErrorHandler('Error commiting transaction', reject);

            const triggerStore = transaction.objectStore('Trigger');
            const cursorRequest = triggerStore.openCursor(trigger.uuid);
            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                let writeRequest;
                if (cursor !== null) {
                    writeRequest = cursor.update(triggerItem);
                } else {
                    writeRequest = triggerStore.add(triggerItem);
                }
                writeRequest.onerror = _createErrorHandler('Error writing database', reject);
            };
        });

    }

    export async function deleteScript(uuid: string) {
        if (database === null) {
            await openDatabase()
        }
        await new Promise((resolve, reject) => {
            const transaction = database.transaction('Script', 'readwrite');
            transaction.oncomplete = resolve;
            transaction.onerror = _createErrorHandler('Error creating transaction', reject);

            const triggerStore = transaction.objectStore('Script');
            triggerStore.delete(uuid);
        });
    }

    export async function deleteTriggers(triggers: string[]) {
        if (database === null) {
            await openDatabase()
        }
        await new Promise((resolve, reject) => {
            const transaction = database.transaction('Trigger', 'readwrite');
            transaction.oncomplete = resolve;
            transaction.onerror = _createErrorHandler('Error creating transaction', reject);

            const triggerStore = transaction.objectStore('Trigger');
            for (let trigger of triggers) {
                triggerStore.delete(trigger);
            }
        });
    }

    export async function queryTrigger(uuid: string): Promise<Trigger|null> {
        if (database === null) {
            await openDatabase()
        }

        const triggerStore = database.transaction('Trigger', 'readonly').objectStore('Trigger');
        const request = triggerStore.get(uuid);
        const triggerItem = await new Promise<any>((resolve, reject) => {
            request.onerror = _createErrorHandler('Error reading database', reject);
            request.onsuccess = () => resolve(request.result);
        });

        if (triggerItem === undefined) {
            return null;
        }
        
        const trigger = Trigger.fromDatabase(triggerItem);
        return trigger;
    }

    async function openDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open("QuiptDB", 2);
            request.onsuccess = () => {
                console.log('onsuccess');
                database = request.result;
                database.onerror = _createErrorHandler("Error loading database");
                resolve();
            }
            request.onerror = _createErrorHandler("Error opening database", reject);
            request.onupgradeneeded = () => {
                console.log('onupgradeneeded');
                const database = request.result;
                database.onerror = _createErrorHandler("Error loading database");
                createDatabase(database, request.transaction!);
            }
        });
    }

    function createDatabase(database: IDBDatabase, transaction: IDBTransaction) {
        let scriptStore: IDBObjectStore;
        if (!database.objectStoreNames.contains('Script')) {
            scriptStore = database.createObjectStore('Script', { keyPath: 'uuid' });
        } else {
            scriptStore = transaction.objectStore('Script');
        }

        for (let index of ['lastUpdated', 'name', 'modifiedTime', 'actors', 'table']) {
            if (!scriptStore.indexNames.contains(index)) {
                scriptStore.createIndex(index, index, { unique: false });
            }
        }

        let triggerStore: IDBObjectStore;
        if (!database.objectStoreNames.contains('Trigger')) {
            triggerStore = database.createObjectStore('Trigger', { keyPath: 'uuid' });
        } else {
            triggerStore = transaction.objectStore('Trigger');
        }

        for (let index of [
                'modifiedTime',
                'requestDivisionId', 'requestText', 'responseText',
                'requestActorIds', 'responseActorIds', 'confidence'
        ]) {
            if (!triggerStore.indexNames.contains(index)) {
                triggerStore.createIndex(index, index, { unique: false });
            }
        }
    }

    function _createErrorHandler(message: string, handler?: (error: any) => void) { 
        return (event: Event) => {
            handler && handler(event.target?.error);
            DialogManager.openDialog({
                heading: "Fatal Error",
                description: `${message}. Error details ${event.target?.error}`,
                dialogButtons: []
            })
        }
    }
}

namespace RemoteDataManager {
    let loggedIn = false;
    let websocket: WebSocket|undefined;

    async function ensureLoggedIn() {
        if (!navigator.onLine) {
            console.log('waiting for online');
            await new Promise(resolve => window.addEventListener('online', resolve, { once: true }));
            console.log('finally online');
        }
        if (loggedIn) {
            return;
        }

        let item = localStorage.getItem('credentials');

        if (!item) {
            DialogManager.openDialog({
                heading: 'Unauthorized',
                description: 'This client is not authorized',
                dialogButtons: []
            })
            throw 'Unauthorized client';
        }

        let creds;
        try {
            creds = JSON.parse(item);
        } catch {
            DialogManager.openDialog({
                heading: 'Fatal Error',
                description: 'The browser stored data that the application cannot understand',
                dialogButtons: []
            })
            throw 'Fatal Error';
        }

        try {
            await login(creds);
            loggedIn = true;
        } catch (error) {
            DialogManager.openDialog({
                heading: "Fatal Error",
                description: `Login failed unexpectedly. Message from the server ${error}`,
                dialogButtons: []
            })
        }
    }

    export async function fetchScriptTableTriggers(uuid: string, lastUpdated: number): Promise<[ArrayBuffer, any]> {
        if (!navigator.onLine) {
            throw 'Wierd race condition';
        }
        await ensureLoggedIn();
        const scriptBaseUrl = `/api/script/${uuid}`;
        return await Promise.all([
            fetch(`${scriptBaseUrl}/table`).then(resp => resp.arrayBuffer()),
            fetch(`${scriptBaseUrl}/triggers?last_access=${lastUpdated}`).then(resp => resp.json()),
        ]);
    }

    export async function deleteScript(uuid: string): Promise<boolean> {
        if (!navigator.onLine) {
            // DialogManager.postToast('Du bist offline');
            return false;
        }

        await ensureLoggedIn();
        await fetch(`/api/script/${uuid}`, {
            method: 'DELETE'
        });

        return true;
    }

    async function createWebsocket() {
        if (hasOpenWebsocket()) {
            return;
        }

        await ensureLoggedIn();

        const protocol = 'ws' + location.protocol.substring(4);
        const scripts = ResourceManager.scriptsResource;

        websocket = new WebSocket(
            `${protocol}//${location.host}/api/scripts/updating?last_access=${scripts.lastUpdated}`);
        websocket.addEventListener("error", (event) => {
            console.error('Websocket error: ', event);
        });
        websocket.addEventListener("message", async (event) => {
            const data = JSON.parse(event.data)
            console.info('Subscriber message; Processing information', data);
            if (data.type !== "connected") {
                await scripts.update(data);
            }
        });
    }

    function hasOpenWebsocket(): boolean {
        return websocket !== undefined && 
            (websocket.readyState === WebSocket.CONNECTING ||
             websocket.readyState === WebSocket.OPEN);
    }

    export async function pollForUpdates() {
        createWebsocket();
        window.addEventListener('online', () => createWebsocket());
    }

    async function login({uuid, password}: {uuid:string, password:string}) {
        let response;
        try {
            response = await fetch("/api/user/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ uuid, password })
            });
        } catch (exception) {
            console.error('Login failed', exception);
        }

        if (response?.ok) {
            return;
        } else {
            throw `Login failed with code: ${response?.status} and message ${await response?.text()}`;
        }

    }
}

export const pollForUpdates = RemoteDataManager.pollForUpdates;

export abstract class Resource {
    public updating = new Observable(false);
}

export type FormattedString = Array<{ style: JSX.CSSProperties|null, string: string }>;

export type TableItem = {
    type: "division",
    name: string
} | {
    type: "trigger",
    uuid: string
};

export class ScriptsResource extends Resource {
    public scripts: Observable<Script[]>;
    public lastUpdated: number;

    constructor(scripts: Script[], lastUpdated: number) {
        super();
        this.scripts = new Observable<Script[]>(scripts)
        this.lastUpdated = lastUpdated;
    }

    private _setLastUpdated() {
        this.lastUpdated = Math.floor(Date.now()/1000);
        localStorage.setItem('Scripts.lastUpdated', this.lastUpdated.toString())
    }

    public remove(uuid: string) {
        const scripts = this.scripts.get().filter(script => script.uuid !== uuid);
        this.scripts.set(scripts);
    }

    public findByUUID(uuid: string): Script|null {
        if (!validate(uuid)) {
            throw 'Invalid UUID';
        }
        return this.scripts.get().find(script => script.uuid === uuid) ?? null;
    }

    public async update(data: any) {
        if (!Array.isArray(data)) {
            console.error("Data from server has not the right format; LOL");
            return;
        }
        this.updating.set(true);

        const newScripts: Script[] = [];
        for (let item of data) {
            let uuid = item.uuid;

            if (!(typeof uuid === 'string' && validate(uuid))) {
                continue;
            }

            const script = this.findByUUID(uuid);
            if (script !== null) {
                await script.update(item);
            } else {
                const newScript = await Script.fromServer(uuid, item);
                if (newScript) {
                    newScripts.push(newScript);
                }
            }
        }

        this._setLastUpdated();
        this.scripts.set([...this.scripts.get(), ...newScripts])
        this.updating.set(false);
    }
}

type IndexIntoTable = number;

export class TableWrapper {
    private _table: TableItem[];

    private _divisions: IndexIntoTable[]|undefined;
    private _triggers: IndexIntoTable[]|undefined;
    private _divisionChangeListeners = new Set<(divisionName: string, divisionIdx: number) => void>();

    constructor(table: TableItem[]) {
        this._table = table;
    }

    private get triggers(): IndexIntoTable[] {
        if (this._triggers === undefined) {
            this._iterateTable();
        }
        return this._triggers!;
    }

    private get divisions(): IndexIntoTable[] {
        if (this._divisions === undefined) {
            this._iterateTable();
        }
        return this._divisions!;
    }

    private _iterateTable() {
        this._divisions = [];
        this._triggers = [];

        let index = 0;
        for (let item of this._table) {
            if (item.type === "trigger") {
                this._triggers.push(index);
            } else {
                this._divisions.push(index);
            }
            index++;
        }
    }

    public getAllDivisions(): string[] {
        return this.divisions.map(idx => this._table[idx].name);
    }

    public getDivisionTriggers(divisionIdx: number): string[] {
        const start = this.divisions[divisionIdx] ?? -1;
        const end = (this.divisions[divisionIdx + 1] ?? this._table.length);
        
        return this._table.slice(start + 1, end).map(item => item.uuid);
    }

    public amountTriggersInDivision(divisionIdx: number): number {
        // return 38;
        const start = this.divisions[divisionIdx] ?? -1;
        const end = (this.divisions[divisionIdx + 1] ?? this._table.length) - 1;

        return end - start;
    }

    public normalizeWithinDivision(divisionIndex: number, triggerIdx: number): number {
        const triggerTableIdx = this.triggers[triggerIdx];
        const divisionTalbeIdx = this.divisions[divisionIndex] ?? -1;
        
        return triggerTableIdx - divisionTalbeIdx - 1;
    }

    public get amountTriggers(): number {
        return this.triggers.length;
    }

    public get amountDivisions(): number {
        return this.divisions.length;
    }

    private _getDivisionFromTriggerIndexRunListeners(triggerIndex: IndexIntoTable) {
        const divisionTableIndex = this.divisions.findLast(tblIdx => tblIdx < triggerIndex)
        if (divisionTableIndex !== undefined) {
            console.log(this.divisions, triggerIndex);
            const division = this._table[divisionTableIndex]
            const divisionIdx = this.divisions.indexOf(divisionTableIndex);
            if (division === undefined) {
                throw 'Some of your interal code is definitly broken';
            }
            if (division.type !== "division") {
                throw 'Some of your interal code is definitly broken';
            }
            this._runListeners(division.name, divisionIdx);
        }
    }

    private _runListeners(divisionName: string, divisionIdx: number) {
        this._divisionChangeListeners.forEach(listener => {
            listener(divisionName, divisionIdx);
        });
    }

    private _calcDivisionChange(newTriggerIndex: number) {
        this._getDivisionFromTriggerIndexRunListeners(newTriggerIndex);
    }

    private _getSingleTrigger(idx: number): [IndexIntoTable, string]|null {
        const tableIndex = this.triggers[idx];
        if (tableIndex === undefined) {
            return null;
        }
        const trigger = this._table[tableIndex];
        if (trigger === undefined) {
            throw 'Some of your interal code is definitly broken';
        }
        if (trigger.type !== "trigger") {
            throw 'Some of your interal code is definitly broken';
        }
        return [tableIndex, trigger.uuid];
    }

    public getTriggerFromIndex(idx: number): string {
        const current = this._getSingleTrigger(idx);
        if (current === null) {
            throw 'WTF ??? Yeah Some of your interal code is definitly broken';
        }
        return current[1];
    }

    public getTriggerIdx(uuid: string): number {
        const tblIdx = this._table.findIndex(item => item.type === "trigger" && item.uuid === uuid);
        if (tblIdx === -1) return -1;
        return this.triggers.indexOf(tblIdx);
    }

    public getTriggerIdxFromIdxInDivision(divisionIdx: number, triggerIdx: number): number {
        const divisionTableIdx = this.divisions[divisionIdx] ?? -1;
        const result = this.triggers.indexOf(divisionTableIdx + 1 + triggerIdx);
        if (result === -1) {
            throw 'Better rethink this a little';
        }
        return result;
    }

    public getTriggersFromIndex(idx: number): [string|null, string, string|null]|null {
        const prev = this._getSingleTrigger(idx - 1);
        const current = this._getSingleTrigger(idx);
        const next = this._getSingleTrigger(idx + 1);
        if (current === null) {
            return null;
        }
        const [tableIndex, trigger] = current;
        this._calcDivisionChange(tableIndex);
        return [<string>prev?.at(1) ?? null, trigger, <string>next?.at(1) ?? null];
    }

    public onDivisionChange(listener: (division: string, divisionIdx: number) => void): () => void {
        this._divisionChangeListeners.add(listener);
        return () =>  {
            this._divisionChangeListeners.delete(listener);
        }
    }

    public asArray(): TableItem[] {
        return this._table;
    }

    public allTriggers(): string[] {
        const triggers: string[] = [];
        for (let item of this._table) {
            if (item.type === "trigger") {
                triggers.push(item.uuid);
            }
        }
        return triggers;
    }

    public update(newTable: TableItem[]) {
        const oldTriggers = this._table.filter(item => item.type === "trigger")
            .map(item => item.uuid);
        const newTriggers = newTable.filter(item => item.type === "trigger")
            .map(item => item.uuid);

        const deletedTriggers: string[] = [];
        for (let triggerUuid of oldTriggers) {
            if (!newTriggers.includes(triggerUuid)) {
                deletedTriggers.push(triggerUuid);
            }
        }

        console.info('deleting triggers', deletedTriggers);
        ResourceManager.deleteTriggers(deletedTriggers);

        this._table = newTable;
        this._divisions = undefined;
        this._triggers = undefined;
    }
}

export type DivisionStats = {
    averageConfidence: number,
    containedActors: FormattedString,
    amountTriggers: number
};

export class Script extends Resource {
    public uuid: string;
    public lastUpdated: number;
    public name: Observable<string>;
    public modifiedTime: Observable<number>;
    public actors: string[];
    public table: TableWrapper;


    private _triggers: Map<string, Trigger>;

    constructor(
        uuid: string,
        lastUpdated: number,
        name: string,
        modifiedTime: number,
        actors: string[],
        table: Array<TableItem>
    ) {
        super();
        this.uuid = uuid;
        this.lastUpdated = lastUpdated;
        this.name = new Observable(name);
        this.modifiedTime = new Observable(modifiedTime);
        this.actors = actors;
        this.table = new TableWrapper(table);

        this._triggers = new Map();
    }

    public async getDivisionStats(idx: number): Promise<DivisionStats> {
        await this.prefetchDivision(idx);

        function addActors(actorIds: number[]|null|"all") {
            if (Array.isArray(actorIds)) {
                actorIds.forEach(foundActors.add.bind(foundActors));
            }
        }

        const triggers = this.table.getDivisionTriggers(idx);
        const foundActors = new Set<number>();
        const confs: number[] = [];
        for (let uuid of triggers) {
            const trigger = this._triggers.get(uuid);
            if (trigger === undefined) {
                continue;
            }
            addActors(trigger.requestActorIds);
            addActors(trigger.responseActorIds);
            if (trigger.confidence > 0) {
                confs.push(trigger.confidence);
            }
        }
        console.log(idx, foundActors, confs);
        function calculateConfidence(): number {
            if (confs.length/triggers.length <= 0.5) {
                return 0;
            }
            return confs.reduce((p, c) => p + c) / confs.length;
        }

        // const containedActors = formatActors.call(this);
        return {
            containedActors: [],
            amountTriggers: triggers.length,
            averageConfidence: calculateConfidence()
        };
    }

    public async delete(): Promise<void> {
        if (await RemoteDataManager.deleteScript(this.uuid)) {
            await ResourceManager.deleteTriggers(this.table.allTriggers());
            await ResourceManager.deleteScript(this.uuid);
            ResourceManager.scriptsResource.remove(this.uuid);
        }
    }

    public prefetchDivision(divisionIdx: number): Promise<any> {
        const triggers = this.table.getDivisionTriggers(divisionIdx);

        const allPromises: Promise<any>[] = [];
        for (let trigger of triggers) {
            if (!this._triggers.has(trigger)) {
                allPromises.push(this.resolveTrigger(trigger));
            }
        }

        return Promise.all(allPromises);
    }

    public getActorsInfo(ids: number[]|"all"|null, isResponse = false): FormattedString|null {
        if (ids === null) {
            return null;
        }
        if (ids === "all") {
            return [{ style: { color: "white" }, string: "Alle" }];
        }
        if (ids.length === 1 && ids[0] === this.actors.length-1 && isResponse) {
            return null;
        }

        const result: FormattedString = ids
            .map(id => [generateSunflowerColor(id), this.actors[id]])
            .map(item => ({ style: { color: item[0] }, string: item[1] }));

        if (result.length === 1) {
            return result;
        }

        for (let i = 0; i < Math.floor(result.length / 2); i++) {
            const index = (i*2)+1;
            result.splice(index, 0, {
                style: null,
                string: (index === result.length-1) ? " und " : ", "
            });
        }

        return result;
    }

    public async resolveTrigger(uuid: string): Promise<Trigger|null> {
        if (uuid === null) {
            return null;
        }
        let trigger = this._triggers.get(uuid) ?? null;
        if (trigger !== null) {
            return trigger;
        }
        trigger = await ResourceManager.queryTrigger(uuid);
        if (trigger !== null) {
            this._triggers.set(trigger.uuid, trigger);
        }
        return trigger;
    }

    public resolveTriggerSync(uuid: string): Trigger|null {
        return this._triggers.get(uuid) ?? null;
    }

    public mapToPersistable(): { [key: string]: any } {
        return {
            uuid: this.uuid,
            lastUpdated: this.lastUpdated,
            name: this.name.get(),
            modifiedTime: this.modifiedTime.get(),
            actors: this.actors,
            table: this.table.asArray()
        };
    }

    private _setLastUpdated() {
        this.lastUpdated = Math.floor(Date.now()/1000);
    }

    public async update(item: any): Promise<void> {
        this.updating.set(true)

        const parsedItem = Script.parseItem(item);
        if (parsedItem !== null) {
            this.name.set(parsedItem.name)
            this.modifiedTime.set(parsedItem.time);
        }

        const [tableRaw, triggers] = await RemoteDataManager.fetchScriptTableTriggers(this.uuid, this.lastUpdated);

        const table = Script.parseTable(tableRaw);
        if (table !== null) {
            this.table.update(table);
        }

        if (Array.isArray(triggers)) {
            for (let triggerItem of triggers) {
                const uuid = triggerItem.uuid;
                if (!(typeof uuid === 'string' && validate(uuid))) {
                    continue;
                }
                const trigger = await this.resolveTrigger(uuid);
                if (trigger !== null) {
                    trigger.update(triggerItem);
                } else {
                    const newTrigger = await Trigger.fromServer(triggerItem);
                    if (newTrigger !== null) {
                        this._triggers.set(newTrigger.uuid, newTrigger);
                    }
                }
            }
        }
        
        this._setLastUpdated();
        await ResourceManager.persistScript(this);
        this.updating.set(false)
    }

    static fromDatabase(item: any): Script {
        console.info('ScriptItem from DB', item);
        return new Script(
            item.uuid,
            item.lastUpdated,
            item.name,
            item.modifiedTime,
            item.actors,
            item.table
        );
    }
    
    static async fromServer(uuid: string, item: any): Promise<Script|null> {
        const parsedItem = Script.parseItem(item);
        if (parsedItem === null) {
            return null;
        }
        const name = parsedItem.name;
        const actors = parsedItem.actors;
        const modifiedTime = parsedItem.time;

        const [tableRaw, triggers] = await RemoteDataManager.fetchScriptTableTriggers(uuid, 0);
        const table = Script.parseTable(tableRaw);
        if (table === null) {
            return null;
        }

        if (!Array.isArray(triggers)) {
            return null;
        }

        const triggersMap = new Map<string, Trigger>();
        for (let triggerItem of triggers) {
            const trigger = await Trigger.fromServer(triggerItem);
            if (trigger !== null) {
                triggersMap.set(trigger.uuid, trigger);
            }
        }

        const script = new Script(
            uuid,
            Math.floor(Date.now()/1000),
            name,
            modifiedTime,
            actors,
            table
        );
        script._triggers = triggersMap;
        await ResourceManager.persistScript(script);
        return script;
    }

    private static parseTable(tableArray: ArrayBuffer): TableItem[]|null {
        const array = new Uint8Array(tableArray);
        const decoder = new TextDecoder();

        const table: TableItem[]  = [];
        let offset = 0;
        while (offset < array.byteLength) {
            if (array[offset] === 0x44) { // Division
                offset += 1;
                const stringEnd = array.indexOf(0x00, offset);
                if (stringEnd === -1) {
                    return null;
                }

                const stringData = array.slice(offset, stringEnd);
                let string;
                try { string = decoder.decode(stringData); }
                catch { return null; }

                table.push({ type: "division", name: string });
                offset = stringEnd + 1;
            } else if (array[offset] === 0x54) {
                const uuidData = array.slice(offset + 1, offset + 17);
                offset += 17;
                table.push({ type: "trigger", uuid: stringify(uuidData) });
            } else {
                return null;
            }
        }
        return table;
    }

    private static parseItem(item: any): { name: string, time: number, actors: string[] }|null {
        const name = item.name;
        const time = item.time; 
        const actors = item.actors;

        if (typeof name !== "string") {
            return null;
        }
        if (typeof time !== "number") {
            return null;
        }
        if (!Array.isArray(actors)) {
            return null;
        }
        if (actors.some(value => typeof value !== "string")) {
            return null;
        }

        return { name, time, actors };
    }
}

type TriggerItemDto = {
    uuid: string,
    time: number
    request_division: number|null,
    request_text: string|null,
    response_text: string,
    request_actors: number[]|null,
    response_actors: number[]|null
}

export class Trigger extends Resource {
    public uuid: string;
    public modifiedTime: number;
    public requestDivisionId: number|null;
    public requestText: FormattedString;
    public responseText: FormattedString;
    public requestActorIds: number[]|"all"|null;
    public responseActorIds: number[]|"all";
    private _confidence: [number, number];

    constructor(
        uuid: string,
        modifiedTime: number,
        requestDivisionId: number|null,
        requestText: FormattedString,
        requestActorIds: number[]|"all"|null,
        responseText: FormattedString,
        responseActorIds: number[]|"all",
        confidence: [number, number]
    ) {
        super();
        this.uuid = uuid;
        this.modifiedTime = modifiedTime;
        this.requestDivisionId = requestDivisionId;
        this.requestText = requestText;
        this.responseText = responseText;
        this.requestActorIds = requestActorIds;
        this.responseActorIds = responseActorIds;
        this._confidence = confidence;
    }

    public get confidence(): number {
        return this._confidence[0];
    }

    public calculateAverageConfidence(confidence: number): number {
        const [confAvg, samples] = this._confidence;
        
        let newAvg: number;
        if (samples > 0) {
            newAvg = (confAvg + confidence) / 2;
        } else {
            newAvg = confidence;
        }

        this._confidence = [newAvg, samples + 1];
        ResourceManager.persistTrigger(this);

        return newAvg;
    }

    public mapToPersistable(): { [key: string]: any } {
        return {
            uuid: this.uuid,
            modifiedTime: this.modifiedTime,
            requestDivisionId: this.requestDivisionId,
            requestText: this.requestText,
            responseText: this.responseText,
            requestActorIds: this.requestActorIds,
            responseActorIds: this.responseActorIds,
            confidence: this._confidence
        };
    }

    public async update(
        item: any,
    ): Promise<void> {
        this.updating.set(true);

        const parsedItem = Trigger.parseItem(item);
        if (parsedItem !== null) {
            this.modifiedTime = parsedItem.time;
            this.requestDivisionId = parsedItem.request_division;
            this.requestText = Trigger.toFormattedString(parsedItem.request_text, parsedItem.request_division);
            this.requestActorIds = Trigger.mapRequestActorIds(parsedItem.request_actors, parsedItem.request_division);
            this.responseText = Trigger.toFormattedString(parsedItem.response_text);
            this.responseActorIds = parsedItem.response_actors === null ? "all" : parsedItem.response_actors;
        } 

        await ResourceManager.persistTrigger(this);
        this.updating.set(false);
    }

    static fromDatabase(item: any): Trigger {
        console.info('TriggerItem from DB', item);
        return new Trigger(
            item.uuid,
            item.modifiedTime,
            item.requestDivisionId,
            item.requestText,
            item.requestActorIds,
            item.responseText,
            item.responseActorIds,
            item.confidence ?? [0, 0]
        );
    }

    static async fromServer(
        item: any,
    ): Promise<Trigger|null> {
        const parsedItem = Trigger.parseItem(item);
        console.log('Trigger.fromServer', item, parsedItem);
        if (parsedItem === null) {
            return null;
        } 
        const modifiedTime = parsedItem.time;
        const requestDivisionId = parsedItem.request_division;
        const requestText = Trigger.toFormattedString(parsedItem.request_text, parsedItem.request_division);
        const requestActorIds = Trigger.mapRequestActorIds(parsedItem.request_actors, parsedItem.request_division);
        const responseText = Trigger.toFormattedString(parsedItem.response_text);
        const responseActorIds = parsedItem.response_actors === null ? "all" : parsedItem.response_actors;

        const trigger = new Trigger(
            parsedItem.uuid,
            modifiedTime,
            requestDivisionId,
            requestText,
            requestActorIds,
            responseText,
            responseActorIds,
            [0, 0]
        );
        await ResourceManager.persistTrigger(trigger);
        return trigger;
    }

    private static parseItem(item: any): TriggerItemDto|null {
        const uuid = item.uuid;
        const time = item.time;
        const request_division = item.request_division;
        const request_text = item.request_text;
        const response_text = item.response_text;
        const request_actors = item.request_actors;
        const response_actors = item.response_actors;

        if (typeof uuid !== "string" || !validate(uuid)) {
            return null;
        }
        if (typeof time !== "number") {
            return null;
        }

        if (!isinstance(request_division, "number", "null")) {
            return null;
        }
        if (!isinstance(request_text, "string", "null")) {
            return null;
        }
        if (typeof response_text !== "string") {
            return null;
        }

        if (!isinstance(request_actors, "array", "null")) {
            return null;
        }
        if (request_actors?.some((actor: any) => typeof actor !== "number")) {
            return null;
        }
        if (!isinstance(response_actors, "array", "null")) {
            return null;
        }
        if (response_actors?.some((actor: any) => typeof actor !== "number")) {
            return null;
        }
        return {
            uuid,
            time,
            request_division,
            request_text,
            response_text,
            request_actors,
            response_actors,
        };
    }

    private static toFormattedString(string: string|null, associated_division?: number|null): FormattedString {
        if (associated_division !== undefined && associated_division !== null) {
            if (string !== null) {
                console.log('Invalid server response');
                return [];
            }
            return [{ style: { 'font-style': 'italic' }, string: "Du bist der erste in diesem Abschnitt" }]
        }
        
        if (string === null) {
            console.log('Invalid server response');
            return [];
        }

        let currentItalic = false;
        const buffer: string[] = [];
        const result: FormattedString = [];
        for (let char of string) {
            if (char === '\x10') {
                if (buffer.length > 0) {
                    if (currentItalic) {
                        buffer.splice(0, 0, '(');
                        buffer.push(')');
                    }
                    result.push({
                        string: buffer.join(''),
                        style: currentItalic ? { 'font-style': 'italic' } : null
                    })
                    buffer.length = 0;
                }
                currentItalic = !currentItalic;
                continue;
            }
            buffer.push(char);
        }

        if (buffer.length > 0) { 
            if (currentItalic) {
                buffer.splice(0, 0, '(');
                buffer.push(')');
            }
            result.push({
                string: buffer.join(''),
                style: currentItalic ? { 'font-style': 'italic' } : null
            })
        }

        return result;
    }

    private static mapRequestActorIds(actors: number[]|null, associated_division: number|null): number[]|"all"|null {
        if (associated_division !== null) {
            return null;
        }
        if (actors === null) {
            return "all";
        }
        return actors;
    }
}

type SmartTypes = "null"|"string"|"number"|"undefined"|"boolean"|"array"|"bigint"|"symbol"|"object"|"function";

function isinstance(value: any, ...types: SmartTypes[]): boolean {
    const stype = smartTypeof(value);
    return types.includes(stype);
}

function smartTypeof(value: any): SmartTypes {
    if (value === null) {
        return "null";
    }
    if (Array.isArray(value)) {
        return "array";
    }
    return typeof value;

}

(async function () {
    ResourceManager.scriptsResource = new ScriptsResource([], 0);
    await ResourceManager.getScripts();
})()
