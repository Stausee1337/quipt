import './App.scss'
import { createSignal, onMount, onCleanup, JSX, createEffect, Component, createMemo, Ref, untrack, createRoot, createResource, mapArray } from 'solid-js';
import { $ } from './observable';
import { CameraDevice, Html5Qrcode, Html5QrcodeResult, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ListItem, ListView, ListViewController, RippleEffect, ProgressSpinner, HeaderElement, HeaderIconButton, quiptClick  } from './std-widgets';
import { DialogManager } from './dialog';
import { Router, Route, query, redirect, useParams } from '@solidjs/router';

import Hammer from 'hammerjs';

import { BubbleHandle, BulbIcon, CircleIcon } from './bubble-handle';
import { DivisionStats, FormattedString, ResourceManager, Script, Trigger } from './resources';
import { ClientConnection, ClientType } from './client-connection';
import { insert } from 'solid-js/web';

console.log(quiptClick);

function formatDate(time: number): string {
    const date = new Date(time * 1000);
    return date.toLocaleDateString("de-DE");
}

function ScriptList() {
    const scripts = $(ResourceManager.scriptsResource.scripts);
    let listView: ListViewController = undefined!;

    const emptyMessage = (
        <div class="script-list-empty-message">
            <span class="secondary-text">
                Damit du mit dem Skript Lernen anfangen kannst, tippe
                auf den <i class="bi bi-qr-code-scan"></i> unten rechts und
                lese <a href='https://quipt.app/docs/getting-started'>Loslegen</a>, um
                sich mit einem Client zu verbinden und ein Script zu erstellen.
            </span>
        </div>
    );

    function goToScriptAdd() {
        router.route('/clients');
    }

    function listItemClick(script: Script) {
        router.route('/script', { script: script.uuid });
    }

    async function lvDelete(scripts: Script[]) {
        for (let script of scripts) {
            await script.delete();
        }
    }

    function mapToListItem(script: Script) {
        const scriptName = $(script.name);
        const updating = $(script.updating);
        const modifiedTime = $(script.modifiedTime);
        return (
            <ListItem heading={scriptName()} icon="file-earmark" onClick={() => listItemClick(script)}>
                <div class="meta-information">
                    <span class="secondary-text">{ formatDate(modifiedTime()) }</span>
                    <div class="spinner-container">
                        { updating() ? <ProgressSpinner size={30} color="rgba(227, 227, 227, 0.75)"/> : null }
                    </div>
                </div>
            </ListItem>
        );
    }


    return (
        <div class="script-list-container">
            <ListView ref={listView} 
                items={scripts()} 
                map={mapToListItem}
                onDelete={lvDelete}
                influencesHeader={false}>
                <ListView.Empty>
                    { emptyMessage }
                </ListView.Empty>
            </ListView>
            <button class="script-add" onClick={goToScriptAdd}>
                <RippleEffect/>
            </button>
        </div>
    );
}

//"ws" + location.protocol.substring(4);

let globalConnection: ClientConnection|null = null;
let connectionRefs = 0;
function ManageClients() {
    if (globalConnection === null) {
        globalConnection = new ClientConnection()
    }
    const connection = globalConnection;
    const [clients, setClients] = createSignal<ClientType[]>([]);

    function updateClients() {
        connection.listClients().then(clients => {
            setClients(clients);
        });
    }
    updateClients();

    onMount(() => {
        connectionRefs++;
    })

    onCleanup(() => {
        connectionRefs--;
        if (connectionRefs === 0) {
            connection.close();
            globalConnection = null;
        }
    })

    async function removeClient(client: ClientType) {
        const dialogResult = await DialogManager.openDialog({
            heading: `${client.info} löschen?`,
            dialogButtons: [
                { dialogResult: 'cancel', title: 'Schließen' },
                { dialogResult: 'delete', title: 'Löschen' },
            ],
            content: () => (
                <>
                    <p style="margin: 0" class="seconary-text">
                        <i style="margin: 0.5rem" class="bi bi-clock-fill"/>
                        Angemldet am {formatDate(client.logged_in_at)}
                    </p>
                    <p style="margin: 0" class="seconary-text">
                        <i style="margin: 0.5rem" class="bi bi-geo-alt-fill"/>
                        Verknüpft aus {client.location}
                    </p>
                </>
            )
        });

        if (dialogResult === 'delete') {
            await connection.removeClient(client.uuid);
            updateClients();
        }
    }

    return (
        <div class="clients-manager">
            <div class="top-card">
                <img src="/clinent-connection.svg" alt="Verbindung zwischen Smartphone und PC"/>
                <span class="secondary-text">
                    Verbinde dein Smartphone mit deinem PC, um
                    Skripte erstellen und bearbeiten zu können<br/>
                    <a href="https://quipt.app/docs/getting-started">Mehr erfahren</a>
                </span>
                <button class="primary-button" onClick={() => {connectionRefs++; router.route('/clients/add')}}>
                    Mit PC verbinden
                    <RippleEffect/>
                </button>
            </div>
            <div class="bottom-card">
                { clients().length === 0 ? null : (
                <>
                    <div class="header">
                        <h3 class="secondary-text">Verknüpfte Geräte</h3>
                        <span class="secondary-text">Tippe auf ein Gerät, um es abzumelden</span>
                    </div>
                    {clients().map(client => 
                        <ListItem heading={client.info}
                            description={`Angemeldet am ${formatDate(client.logged_in_at)}`} 
                            icon="tv"
                            onClick={() => removeClient(client)}
                            />
                    )}
                </>
                )}
            </div>
        </div>
    );
}

function AddClientQR() {
    let html5QrScanner: Html5Qrcode | null = null;
    const [loading, setLoading] = createSignal(true);
    const connection = globalConnection;

    onMount(async () => {
        let cameras: CameraDevice[];
        try {
             cameras = await Html5Qrcode.getCameras();
        } catch (error) {
            alert(error);
            router.goBack();
            return;
        }
        const camera = cameras.find(dev => dev.label.includes('0,')) ?? cameras[0];

        html5QrScanner = new Html5Qrcode("qr-scanner-container", {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
        });
        setLoading(false);
        await html5QrScanner.start(
            camera.id,
            { fps: 10, aspectRatio: 16/9, qrbox: 300 },
            qrScanSuccess,
            undefined
        );
    });

    async function qrScanSuccess(text: string, _result: Html5QrcodeResult) {
        html5QrScanner?.pause(true);
        navigator.vibrate(200);
        const promise = connection!.verifyToken(text);

        async function onDismiss(token: string) {
            handled = true;
            await connection!.dismissToken(token);
        }

        async function onAccept(token: string) {
            handled = true;
            await connection!.acceptToken(token);
            accepted = true;
        }

        let accepted = false;
        let handled = false;
        let client: ClientType|undefined;
        await DialogManager.openBottomSheet(({ closer }) => {
            const [client, setClient] = createSignal<ClientType|null>(null);
            promise.then(client => {
                if (client === null) {
                    closer();
                }
                setClient(client)
            });
            return (
                <div id="qr-code-scan-success"> 
                    {client() === null ? 
                    (<div class="loading">
                        <ProgressSpinner size={50}/>
                    </div>) : 
                    (<div class="client-info">
                        <h1>Client überprüfen</h1> 
                        <div class="content">
                            <h3>
                                <i class="bi bi-tv"></i>
                                { client()!.info }
                            </h3>
                            <p>
                                <i class="bi bi-geo-alt-fill"></i>
                                { client()!.location }
                            </p>
                        </div>
                        <div class="button-bar">
                            <button class="secondary-button" 
                                onClick={async () => {await onDismiss(client()!.hex_token); closer()}}>
                                Abbrechen
                                <RippleEffect color='#06f990'/>
                            </button>
                            <button class="primary-button" 
                                onClick={async () => {await onAccept(client()!.hex_token); closer()}}>
                                Client annehmen
                                <RippleEffect/>
                            </button>
                        </div>
                    </div>)}
                </div>            
            );
        });

        if (!handled) {
            const token = client?.hex_token;
            if (token) {
                connection!.dismissToken(token);
            }
        }

        if (!accepted) { 
            html5QrScanner?.resume();
            return;
        }

        router.goBack();
    }

    onCleanup(() => {
        html5QrScanner?.stop();
        connectionRefs--;
    })
    
    return (
        <div id="qr-scanner-container" classList={{'loading': loading()}}>
            { loading() ? <ProgressSpinner/> : null }
        </div>
    );
}

type QuoteViewProps = {
    last: boolean,
    text: FormattedString,
    actorsInfo: FormattedString|null,
    type: "request"|"response",
    isTextShown?: boolean,
    onShowText?: () => void,
    confidenceReport?: (source: HTMLElement, confidence: "low"|"medium"|"high") => void
};

function formatString(string: FormattedString): JSX.Element {
    const result: JSX.ArrayElement = [];

    for (let item of string) {
        if (item.style === null) {
            result.push(item.string);
        } else {
            result.push(<span style={item.style}>{item.string}</span>);
        }
    }

    return result;
}

function QuoteView(props: QuoteViewProps) {
    const [showText, setShowText] = createSignal(props.type === "request" || props.isTextShown);

    let element: HTMLDivElement = undefined!;
    let contentElement: HTMLSpanElement = undefined!;
    // if (props.type === "response") {
    //     createEffect(() => {
    //         if (showText()) {
    //             props.onShowText && props.onShowText();
    //         }
    //     });
    // }

    // let animating = false;
    // let previousSize: [number, number]|undefined;
    // const resizeObserver = new ResizeObserver(_ => {
    //     if (animating) {
    //         return;
    //     }
    //     const rect = element.getBoundingClientRect();
    //     if (previousSize === undefined) {
    //         previousSize = [rect.width, rect.height];
    //     } else {
    //         const [prevWidth, prevHeight] = previousSize;
    //         const contentRect = contentElement.getBoundingClientRect();

    //         contentElement.classList.add('growing-animation');
    //         contentElement.style.top = `${contentRect.top - rect.top}px`;
    //         contentElement.style.right = `${rect.right - contentRect.right}px`;
    //         contentElement.style.width = `${contentRect.width}px`;
    //         contentElement.style.height = `${contentRect.height}px`;

    //         animating = true;
    //         const animation = element.animate([
    //             { width: `${prevWidth}px`, height: `${prevHeight}px` },
    //             { width: `${rect.width}px`, height: `${rect.height}px` },
    //         ], { duration: 200 });
    //         animation.addEventListener('finish', () => {
    //             contentElement.style.top = null!;
    //             contentElement.style.right = null!;
    //             contentElement.style.width = null!;
    //             contentElement.style.height = null!;
    //             contentElement.classList.remove('growing-animation');
    //             setTimeout(() => { animating = false; })
    //         });
    //     }
    // });

    // onMount(() => {
    //     if (props.type === "response") {
    //         resizeObserver.observe(element);
    //     }
    // })

    // onCleanup(() => {
    //     if (props.type === "response") {
    //         resizeObserver.unobserve(element);
    //     }
    // })

    return (
        <div class="quote-wrapper">
            <div class={`quote ${props.type}`} 
                classList={{'last': props.last}}
                ref={element}>
                { props.actorsInfo !== null ? <h3>{ formatString(props.actorsInfo) }</h3> : null }
                <span class="content" ref={contentElement}>
                    { formatString(props.text) }
                </span>
            </div>
            {
                props.type === "response" ? (
                    <div class="confidence-rating">
                        <span class="smiley" onClick={event => props.confidenceReport?.(event.target, 'low')}/>
                        <span class="smiley" onClick={event => props.confidenceReport?.(event.target, 'medium')}/>
                        <span class="smiley" onClick={event => props.confidenceReport?.(event.target, 'high')}/>
                    </div>
                ) : null
            }
        </div>
    );
}

type EventuallyCallback<T> = (cb: (value: T) => void) => void;

function eventuallyCallbackFromPromiseClosure<T>(closure: () => Promise<T>): EventuallyCallback<T> {
    return (cb) => {
        closure().then(cb);
    };
}

type TriggerViewerRef = {
    updateView(): void
};

type SingleTriggerViewerProps = {
    ref: Ref<TriggerViewerRef>,
    script: Script,
    prevTrigger: () => EventuallyCallback<Trigger>|null,
    currentTrigger: () => EventuallyCallback<Trigger>,
    nextTrigger: () => EventuallyCallback<Trigger>|null,
    goTo: (direction: "previous"|"next") => void,
    onReveal: () => void,
    onTriggerChanged: () => void
};

type ActorsInfo = {
    requestActorsInfo: FormattedString|null,
    responseActorsInfo: FormattedString|null
};


type Type<T> = {
    [K in keyof T]: T[K];
}

type AsyncResource<T> = Type<T> & {
    loaded: boolean,
    hasValue: boolean,
    reset: () => void
};

type ExtendedTrigger = ActorsInfo & Type<Trigger>;

function createAsyncResource<T>(resource: EventuallyCallback<T>): AsyncResource<T> {
    const [loading, setLoading] = createSignal<"stale"|"loading"|"loaded">("stale");
    const resourceWrapper: { inner: T } = { inner: null! };

    function reload() {
        setLoading("loading");
        resource(result => {
            resourceWrapper.inner = result;
            setLoading("loaded");
        });
    }

    return new Proxy<AsyncResource<T>>(
        resourceWrapper as any,
        {
            get(target, prop, _receiver) {
                const loadingResult = loading();
                if (loadingResult === "stale") {
                    reload();
                }
                if (prop === "loaded") {
                    return loadingResult === "loaded";
                } else if (prop === "reset") {
                    return () => {
                        setLoading("stale");
                        resourceWrapper.inner = null!;
                    };
                } else if (prop === "hasValue") {
                    return Boolean((target as any).inner)
                } else {
                    return (target as any).inner[prop];
                }
            }
        }
    )
}

function mapToExtendedTrigger(script: Script, trigger: Trigger): ExtendedTrigger {
    return {
        requestActorsInfo: script.getActorsInfo(trigger.requestActorIds),
        responseActorsInfo: script.getActorsInfo(trigger.responseActorIds, true),
        ...trigger
    } as any;
}

function formatConfidence(conf: number, digits=1): string {
    if (conf === 0) {
        return '?';
    }

    return Intl.NumberFormat('de-DE', {
        minimumSignificantDigits: digits + 1,
        maximumSignificantDigits: digits + 1 }
    ).format(conf * 5);
}
function DivisionStatsViewer(props: { stats: Promise<DivisionStats> }) {
    const [stats] = createResource(() => props.stats);

    
    const star = "bi bi-star-fill";
    const play = "bi bi-chat-fill";
    return (
        <>
            { stats.loading ? null : 
            <div class="elements">
                <span class="icon-element chat">{stats()!.amountTriggers}</span>
                <span class="icon-element bulb">{formatConfidence(stats()!.averageConfidence)}</span>
            </div>
            }
        </>
    );
}

function DivisionOverview(props: {
    script: Script,
    currentDivision: number,
    onDivisionChange: (idx: number) => void
}) {
    const chf = (idx: number) => () => {
        if (idx !== props.currentDivision) {
            props.onDivisionChange(idx);
        }
        router.goBack();
    };
    return (
        <div class="division-overview">
            <div class="content">
                <div class="simple-header">
                    <HeaderIconButton icon="arrow-left" onClick={() => router.goBack()}/>
                </div>
                <div class="grid-view">
                    { props.script.table.getAllDivisions().map((name, idx) => 
                        <div class="item" onClick={chf(idx)} classList={{current: idx === props.currentDivision}}>
                            <h3>{name}</h3>
                            <DivisionStatsViewer stats={props.script.getDivisionStats(idx)}/>
                        </div>
                      )
                    }
                </div>
            </div>
        </div>
    );
}

function SingleTriggerViewer(props: SingleTriggerViewerProps) {
    const [mode, setMode] = createSignal<"normal"|"swiping">("normal");
    const [respTextShown, setRespTextShown] = createSignal(false);

    const simpleRef: TriggerViewerRef = {
        updateView() { 
            setMode("normal");
            setRespTextShown(false);
            prevTriggerResource.reset();
            currentTriggerResource.reset();
            nextTriggerResource.reset();
            props.onTriggerChanged();
        }
    };
    const ref = props.ref;
    typeof ref === "function" ? untrack(() => ref(simpleRef)) : props.ref = simpleRef;

    function simplifyResourceCreation(
        script: Script,
        creationFunction: () => EventuallyCallback<Trigger>|null
    ): AsyncResource<ExtendedTrigger> {
        return createAsyncResource<ExtendedTrigger>(cb => {
            const eventuallyCallback = creationFunction();
            if (eventuallyCallback === null) {
                return null;
            }
            eventuallyCallback(trigger => cb(mapToExtendedTrigger(script, trigger)))
        });
    }

    const prevTriggerResource = simplifyResourceCreation(props.script, props.prevTrigger);
    const currentTriggerResource = simplifyResourceCreation(props.script, props.currentTrigger);
    const nextTriggerResource = simplifyResourceCreation(props.script, props.nextTrigger);

    let hammer: HammerManager = undefined!;
    let contentElement: HTMLDivElement = undefined!;
    let swiperElement: HTMLDivElement = undefined!;

    onMount(() => {
        hammer = new Hammer(contentElement)
        hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

        hammer.on('pan', onPan);
        hammer.on('panstart', onPanStart)
        hammer.on('panend', onPanEnd)
    });
 
    const left = -window.innerWidth;
    let pageWidth = window.innerWidth;

    function onPan(event: HammerInput) {
        if (event.deltaX < 0 && !nextTriggerResource.hasValue) {
            return;
        }
        if (event.deltaX > 0 && !prevTriggerResource.hasValue) {
            return;
        }
        swiperElement.style.left = `${left + event.deltaX}px`;
    }

    function onPanStart(_event: HammerInput) {
        setMode("swiping");
        swiperElement.style.left = `${left}px`;
    }

    const DEFAULT_VELOCITY = 1;
    function onPanEnd(event: HammerInput) {
        // debugger;
        const sLeft = Math.round(swiperElement.getBoundingClientRect().left);
        if (sLeft === left) {
            // swiperElement.style.left = `${left}px`;
            setMode("normal");
            return;
        }
        if (Math.abs(event.deltaX/left) <= 0.5 && Math.abs(event.velocityX) < 1) {
            const animation = swiperElement.animate([
                { left: `${left + event.deltaX}px` },
                { left: `${left}px` },
            ], { duration: 250, easing: 'ease-out' });
            animation.addEventListener('finish', () => {
                swiperElement.style.left = `${left}px`;
                setMode("normal");
            })
            return;
        }

        const finalLeft = event.deltaX < 0 ? -(pageWidth * 2) : 0;
        const remainingWidth = pageWidth - Math.abs(event.deltaX);
        const velocity = DEFAULT_VELOCITY + Math.abs(event.velocityX);
        const animationTime = (remainingWidth / velocity);
        const animation = swiperElement.animate([
            { left: `${left + event.deltaX}px` },
            { left: `${finalLeft}px` },
        ], { duration: animationTime, easing: 'linear' });
        animation.addEventListener('finish', () => {
            swiperElement.style.left = `${finalLeft}px`;
            props.goTo(event.deltaX < 0 ? "next" : "previous");
            setMode("normal");
            setRespTextShown(false);
            prevTriggerResource.reset();
            currentTriggerResource.reset();
            nextTriggerResource.reset();
            props.onTriggerChanged();
        });
    }

    function onShowText() {
        setRespTextShown(v => {
            if (!v) {
                props.onReveal();
            }
            return true;
        }); 
    }

    return (
        <>
            <div class="main-content" classList={{"swiping-mode": mode() === "swiping"}} ref={contentElement}>
                { mode() === "normal" ? 
                    (   currentTriggerResource.loaded ?
                        (<>
                            <QuoteView type="request" 
                                text={currentTriggerResource.requestText} 
                                actorsInfo={currentTriggerResource.requestActorsInfo}/>
                            <QuoteView type="response" 
                                text={currentTriggerResource.responseText} 
                                actorsInfo={currentTriggerResource.responseActorsInfo} 
                                isTextShown={respTextShown()}
                                onShowText={onShowText}/>
                        </>) : <p>Loading</p>
                    ) :
                    (
                        <div class="swiper" ref={swiperElement}>
                            <div class="swiper-page">
                                { prevTriggerResource.hasValue ?
                                ( prevTriggerResource.loaded ? (<>
                                <QuoteView type="request" 
                                    text={prevTriggerResource.requestText} 
                                    actorsInfo={prevTriggerResource.requestActorsInfo}/>
                                <QuoteView type="response" 
                                    text={prevTriggerResource.responseText}
                                    actorsInfo={prevTriggerResource.responseActorsInfo}/> 
                                </>) : <p>Loading</p>) : null }
                            </div>
                            <div class="swiper-page">
                                <QuoteView type="request" 
                                    text={currentTriggerResource.requestText} 
                                    actorsInfo={currentTriggerResource.requestActorsInfo}/>
                                <QuoteView type="response" 
                                    text={currentTriggerResource.responseText} 
                                    actorsInfo={currentTriggerResource.responseActorsInfo} 
                                    isTextShown={respTextShown()}/>
                            </div>
                            <div class="swiper-page">
                                { nextTriggerResource.hasValue ?
                                ( nextTriggerResource.loaded ? (<>
                                <QuoteView type="request" 
                                    text={nextTriggerResource.requestText} 
                                    actorsInfo={nextTriggerResource.requestActorsInfo}/>
                                <QuoteView type="response" 
                                    text={nextTriggerResource.responseText}
                                    actorsInfo={nextTriggerResource.responseActorsInfo}/>
                                </>) : <p>Loading</p>) : null }
                            </div>
                        </div>
                    )
                }
            </div>
        </>
    );
}

function wrapResolveTrigger(script: Script, uuid: string|null): EventuallyCallback<Trigger>|null {
    if (uuid === null) {
        return null;
    }
    const eventuallyCallback = eventuallyCallbackFromPromiseClosure(() => script.resolveTrigger(uuid));
    return cb => {
        eventuallyCallback(trigger => {
            if (trigger === null) {
                throw 'Non existent trigger in table';
            }
            cb(trigger);
        })
    };
}

function easeOut(x) {
    return Math.sin((x * Math.PI) / 2);
    // return 1 - Math.pow(1 - t, 3); // close approximation
}

function animateScroll(element: HTMLElement, top: number, duration: number): Promise<void> {
    let resolve;
    const promise = new Promise(resolve_ => { resolve = resolve_; });
    const from = element.scrollTop;
    const to = top;

    function doAnimation(dt: number, start: number, current: number) {
        const progress = Math.min(current - start, duration) / duration;
        if (progress >= 1.0)
            setTimeout(resolve, 0);
        else
            requestAnimationFrame(timestamp => doAnimation(timestamp - current, start, timestamp));
        element.scrollTop = easeOut(progress) * (to - from) + from;
    }

    requestAnimationFrame(current => {
        requestAnimationFrame(timestamp => doAnimation(timestamp - current, current, timestamp));
    });
    return promise;
}


const progressBarGreen = '#5d9948';
const progressBarYellow = '#fad541';
const progressBarOrange = '#ffa459';
const progressBarRed = '#fa742c';

function ScriptView(props: { script: string }) {
    const root = document.getElementById("root");

    const params = useParams<{ uuid: string }>();
    const script = ResourceManager.scriptsResource.findByUUID(params.uuid)!;
    const table = script.table;


    const scriptName = $(script.name);
    const [currentIdx, setCurrentIdx] = createSignal(0);
    const [currentDivision, setCurrentDivision] = createSignal<string|null>(null);
    const [currentDivisionIdx, setCurrentDivisionIdx] = createSignal<number>(-1);
    const [currentTriggerConfidence, setCurrentTriggerConfidence] = createSignal(0);

    let divisionSymbol: HTMLDivElement|undefined = undefined;
    table.onDivisionChange((divisionName, divisonIdx) => {
        const prevDivision = currentDivision();
        setCurrentDivision(divisionName);
        setCurrentDivisionIdx(divisonIdx);
        if (divisionName !== prevDivision && divisionName !== null && divisionSymbol !== undefined) {
            divisionSymbol.animate([
                { transform: `scale(1)`, offset: 0},
                { transform: `scale(1.5)`, offset: 0.5},
                { transform: `scale(1)`, offset: 1},
            ], { duration: 250 })
        }
    });

    let triggerTuple: [string|null, string, string|null] = table.getTriggersFromIndex(0)!;

    createEffect(() => {
        triggerTuple = table.getTriggersFromIndex(currentIdx())!;
        script.resolveTrigger(triggerTuple[1]).then(trigger => {
            setCurrentTriggerConfidence(trigger?.confidence ?? 0);
        });
    });

    function goTo(direction: "previous"|"next") {
        switch (direction) {
            case 'previous':
                {
                    if (currentIdx() === 0) {
                        throw 'No previous element';
                    }
                    setCurrentIdx(idx => idx - 1)
                }
                break;
            case 'next':
                {
                    if (currentIdx() === table.amountTriggers - 1) {
                        throw 'No next element';
                    }
                    setCurrentIdx(idx => idx + 1)
                }
                break;
        }
    }

    function goToDivision(divisionIdx: number) {
        if (currentDivisionIdx() === divisionIdx) {
            return;
        }
        const trigger = table.getDivisionTriggers(divisionIdx).filter(t => t !== undefined)[0];
        setCurrentIdx(table.getTriggerIdx(trigger));
        stvRef.updateView();
    }

    function openOverview() {
        if (script.table.amountDivisions === 0) {
            return;
        }
        router.pushFrame("divisions", () => {
            return createRoot(dispose => {
                onCleanup(() => {
                    root.children[root.children.length - 1].remove();
                })
                insert(root, <DivisionOverview script={script}
                    currentDivision={currentDivisionIdx()} onDivisionChange={goToDivision}/>);
                return dispose;
            })
        });
    }
    // after the `goTo` ran, all of the resolveTrigger lambdas should have been resolved
    
    function updateTriggerConfidence(newConfidence: number): number {
        const trigger = script.resolveTriggerSync(triggerTuple[1]);
        if (trigger === null) {
            return 0;
        }
        const newConf = trigger.calculateAverageConfidence(newConfidence);
        setCurrentTriggerConfidence(newConf);
        return newConf;
    }

    function generateSunflowerColor(idx: number, saturation = 95, value = 70): string {
        const PHI = (5 ** 0.5 + 1) * 0.5;
        return `hsl(${((PHI * idx) % 1) * 360}deg, ${saturation}%, ${value}%)`;
    }

    function append() {
        const prev = root.scrollTop;
        setLength(p => p + 1);
        root.scrollTop = prev;
        push();
    }

    let scrollLocked = false;

    function push() {
        // setLength(p => p + 1);
        // const view = document.querySelector("div.script-view");
        // console.log(view?.children.length === length() + 2);
        // setTimeout(() => {}, 100);
        // root.scroll({ top: root.scrollHeight, behavior: 'smooth' });
        scrollLocked = true;
        animateScroll(root, root.scrollHeight - root.offsetHeight, 250)
            .then(() => {
                scrollLocked = false;
            });
    }

    function scrollListener(event: Event) {
        if (scrollLocked) return;
        const view = document.querySelector("div.script-view");
        if (root.scrollTop !== (root.scrollHeight - root.offsetHeight)) {
            view.classList.add('free-scrolling');
        } else {
            view.classList.remove('free-scrolling');
        }
    }

    const [stickyDivisionVisible, setStickyDivisionVisible] = createSignal<boolean>(false);

    const observer = new IntersectionObserver(entries => {
        setStickyDivisionVisible(!entries[0].isIntersecting);
    }, { root });

    onMount(() => {
        const view = document.querySelector("div.script-view");
        observer.observe(view.querySelector('h2'));
        root.addEventListener('scroll', scrollListener);
    });

    onCleanup(() => {
        const view = document.querySelector("div.script-view");
        observer.unobserve(view.querySelector('h2'));
        root.removeEventListener('scroll', scrollListener);
    });

    const [length, setLength] = createSignal<number>(1);
    const [currentScore, setCurrentScore] = createSignal<number>(0);
    const [scoreString, setScoreString] = createSignal<string>(String(currentScore()));
    const [progressBarColor, setProgressBarColor] = createSignal<string>(progressBarGreen);
    const maxPoints = 25 * 4;

    function checkIsLast(n: number, length: number): boolean {
        const lastIndex = length - 1;
        return Math.floor(n / 2) === Math.floor(lastIndex / 2);
    }

    function calculateIndicatorColor(score: number): string {
        switch (score) {
            case 1:
                return progressBarGreen;
            case 2:
            case 4:
                return progressBarYellow;
            default:
                return progressBarRed;
        }
    }

    function calculateBarColor(score: number): string {
        const p = score / maxPoints;
        if (p > 1)
            return progressBarRed;
        else if (p >= 0.5)
            return progressBarOrange;
        else if (p >= 0.1)
            return progressBarYellow;
        return progressBarGreen;
    }

    function reportConfidence(source: HTMLElement, confidence: "low"|"medium"|"high") {
        let diff;
        switch(confidence) {
            case 'low':
                diff = 1;
                break;
            case 'medium':
                diff = 2;
                break;
            case 'high':
                diff = 4;
                break;
        }
        append();
        const view = document.querySelector("div.script-view");
        const score = view.querySelector('h2.score');
        const targetRect = score.getBoundingClientRect();
        const sourceRect = source.getBoundingClientRect();
        const indicatorColor = calculateIndicatorColor(diff);

        source.parentElement.insertBefore(
            formatString([{ style: { color: indicatorColor }, string: `+${diff}` }])[0],
            source.parentElement.firstChild);

        const flyingIcon: HTMLSpanElement = (
            <span
                class="flying-icon"
                style={{ top: `${sourceRect.top}px`, left: `${sourceRect.left}px`, color: indicatorColor }}>
                +{diff}
            </span>);
        document.body.appendChild(flyingIcon);

        const animation = flyingIcon.animate([
            { top: `${sourceRect.top}px`, left: `${sourceRect.left}px`, offset: 0 },
            { top: `${targetRect.top}px`, left: `${targetRect.left}px`, offset: 1 },
        ], { duration: 500, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' });

        animation.addEventListener('finish', () => {
            flyingIcon.remove();
            setCurrentScore(p => p + diff);
            const color = calculateBarColor(currentScore());

            const centerX = targetRect.left + (targetRect.width / 2);
            const centerY = targetRect.top  + (targetRect.height / 2);

            const size = window.innerWidth;
            const coordX = centerX - size / 2;
            const coordY = centerY - size / 2;

            const bubble: HTMLSpanElement = <span
                class="score-ripple-bubble"
                style={{ top: `${coordY}px`, left: `${coordX}px`, '--bubble-color': color }}/>;
            bubble.addEventListener('animationend', () => {
                bubble.remove();
            });
            document.body.appendChild(bubble);
        });
    }

    createEffect(prev => {
        const current = currentScore();
        setProgressBarColor(calculateBarColor(current));
        createScoreAnimation(prev, current);
        return current;
    }, currentScore())

    function createScoreAnimation(start: number, end: number) {
        const effect: string[] = [];
        for (let c = start; c <= end; c++) {
            effect.push(String(c));
        }

        let currentIndex = 0;
        function advance() {
            if (currentIndex === effect.length - 1)
                clearInterval(interval);
            setScoreString(effect[currentIndex]);
            currentIndex++;
        }

        let interval;
        advance();
        if (effect.length > 1)
            interval = setInterval(advance, 75);
    }

    return (
        <div class="script-view">
            <span class="sticky-division" classList={{"visible": stickyDivisionVisible()}}>
                2. Szene — Kevin und der böse Wolf
            </span>
            <div class="division-preamble">
                <h2>2. Szene — Kevin und der böse Wolf</h2>
                <div class="division-info-wrapper">
                    <div class="division-info">
                        <span class="info">Mia, Kevin, Bär, Einbrecher · 25 Einsätze</span>
                        <span class="content">
                            { formatString([{ style: null, string: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas lacus nunc, ornare sed felis sit amet, laoreet sagittis enim. Fusce eu felis ultricies, tempor dui sed, elementum diam." }]) }
                        </span>
                    </div>
                </div>
                <div style={{flex: 1}}/>
                <QuoteView 
                    last={checkIsLast(0, length())}
                    type="request"
                    text={[{ style: null, string:"This is some crazy Text! I hope you can remember it" }]}
                    actorsInfo={[{ style: null, string: "Your Mom" }]}/>
            </div>
            <div class="main-content">
                { 
                    mapArray(
                        () => Array.from({ length: length() - 1 }, (_, index) => index + 1),
                        n => <QuoteView 
                             last={checkIsLast(n, length())}
                             type={n % 2 === 0 ? "request" : "response"}
                             confidenceReport={n === length() - 1 ? reportConfidence : undefined}
                             text={[{ style: null, string:"This is some crazy Text! I hope you can remember it" }]}
                             actorsInfo={n % 2 !== 0 ? null : [{ style: null, string: "Your Mom" }]}/>)
                }
            </div>
            <div class="scroll-padding"/>
            <div class="controls">
                <div class="horizontal">
                    <h2 class="score">{ scoreString() }</h2>
                    <div 
                        class="progress"
                        style={{'--progress-width': Math.min(currentScore() / maxPoints, 1),
                            '--progress-color': progressBarColor()}}
                        classList={{glow: progressBarColor() !== progressBarGreen}}>
                        <div class="inner"/>
                    </div>
                </div>
                <button disabled={length() % 2 === 0} class="primary-button" onClick={append}>Aufdecken</button>
            </div>
        </div>
    );
}

type ConfidenceRef = {
    selectView(): void,
    closeView(): void,
}

function ConfidenceWidget(props: {
    ref?: Ref<ConfidenceRef>,
    confidence: number,
    onInteraction: (value: number) => number
}) {
    const [rating, setRating] = createSignal([0, 0, 0, 0, 0]);
    const [view, setView] = createSignal<"display"|"select">("display");
    const [internConfidence, setInternConfidence] = createSignal<number>(props.confidence);

    createEffect(() => {
        console.log('setInternConfidence', props.confidence);
        setInternConfidence(props.confidence);
    });

    createEffect(() => {
        if (view() !== "display") {
            selectContainer.style.display = null!;
            circleSvg.style.visibility = 'hidden';
        } else {
            selectContainer.style.display = 'none';
        }
    });

    let animating = false;
    let prevWidth = 55;
    const resizeObserver = new ResizeObserver(() => {
        if (animating) {
            return;
        }
        const rectE = iconElement.getBoundingClientRect();
        if (rectE.width === prevWidth) {
            return;
        }
        const rectC = selectContainer.getBoundingClientRect();
        animating = true;
        selectContainer.style.width = `${rectC.width}px`;
        selectContainer.style.left = `50%`;
        selectContainer.style.transform = `translate(-50%, 0)`;
        iconElement.animate([
            { width: `${prevWidth}px` },
            { width: `${rectE.width}px` },
        ], { duration: 250 }).addEventListener('finish', () => {
            selectContainer.style.width = null!;
            selectContainer.style.left = null!;
            selectContainer.style.transform = null!;
            setTimeout(() => animating = false);
        })
    });

    onMount(() => {
        resizeObserver.observe(iconElement);
    });


    const simpleRef: ConfidenceRef = {
        selectView() {
            setView("select");
            setTimeout(() => {
                const GAP = 5;
                Array.from(selectContainer.children).filter(p => {
                    if (!(p instanceof SVGSVGElement)) {
                        return false;
                    }
                    if (p.classList.contains('display')) {
                        return false;
                    }
                    return true;
                }).forEach((child, idx) => {
                    const distance = (idx - 2);
                    const width = child.getBoundingClientRect().width + GAP;

                    const animation = child.animate([
                        { transform: `translate(${distance * width * -1}px, 0)` },
                        { transform: `translate(0, 0)` },
                    ], { duration: 250 });
                    console.log(animation);
                });
            });
        },
        closeView() {
            const GAP = 5;
            const rectC = selectContainer.getBoundingClientRect();
            const rectE = iconElement.getBoundingClientRect();
            selectContainer.style.width = `${rectC.width}px`;
            selectContainer.style.left = `50%`;
            selectContainer.style.transform = `translate(-50%, 0)`;
            animating = true;
            iconElement.animate([
                { width: `${rectE.width}px` },
                { width: `${prevWidth}px` },
            ], { duration: 250 }).addEventListener('finish', () => {
                selectContainer.style.left = null!;
                selectContainer.style.transform = null!;
                selectContainer.style.width = null!;
                iconElement.style.width = `${prevWidth}px`;
                setRating([0, 0, 0, 0, 0]);
                setView("display");
                setTimeout(() => {
                    iconElement.style.width = null!;
                    animating = false;
                    circleSvg.style.visibility = null!;
                });
            });
            Array.from(selectContainer.children).forEach((child, idx) => {
                const distance = (idx - 2);
                const width = child.getBoundingClientRect().width + GAP;

                child.animate([
                    { transform: `translate(0, 0)` },
                    { transform: `translate(${distance * width * -1}px, 0)` }
                ], { duration: 250 });
            });
        }
    };

    const ref = props.ref;
    typeof ref === "function" ? untrack(() => ref(simpleRef)) : props.ref = simpleRef;

    const chf = (button: number) => () => {
        const newRating = [0, 0, 0, 0, 0];
        for (let idx = 0; idx <= button; idx++) {
            newRating[idx] = 1;
        }
        setRating(newRating);
        setInternConfidence(props.onInteraction((button + 1)/5));
        simpleRef.closeView();
    };

    let container: HTMLDivElement = undefined!;
    let iconElement: HTMLSpanElement = undefined!;
    let selectContainer: HTMLDivElement = undefined!;
    let circleSvg: SVGSVGElement = undefined!;
    // <BulbIcon ref={bulbSvg} p={internConfidence()}/>
    return (
        <div class="confidence-selector" ref={container} data-ttt={internConfidence()}>
            <span class="icon-element bulb" ref={iconElement}>
                <CircleIcon p={view() === "display" ? internConfidence() : 0} ref={circleSvg}/>
                { view() === "display" ? formatConfidence(internConfidence()) : null }
                <div class="select-container" ref={selectContainer}>
                    { view() === "display" ? null : rating().map((r, idx) => <BulbIcon onClick={chf(idx)} p={r}/>) }
                </div>
            </span>
        </div>
    );
}

type DivisionScrollProps = {
    division: number,
    script: Script,
    currentTriggerIdx: number,
    onTriggerSelected: (idx: number) => void
};

function ViewDecider(props: DivisionScrollProps) {
    const wouldOverflow = createMemo(() => 
        window.innerWidth * 0.94 <= props.script.table.amountTriggersInDivision(props.division) * 11
    );

    return <>{ !wouldOverflow() ? <BallsView {...props}/> : <OverflowSafeView {...props}/>}</>
}

function VerticalView(props: DivisionScrollProps) {
    const [currentBallIdx, setCurrentBallIdx] = createSignal(props.currentTriggerIdx);
    const [quoteContent, setQuoteContent] = createSignal<JSX.Element>(null);

    createEffect(() => {
        const prev = ballsContainer.querySelector<HTMLSpanElement>(
            `span.ball.highlighted`);
        if (prev) {
            prev.classList.remove('highlighted');
        }
        const currentBallEl = ballsContainer.querySelector<HTMLSpanElement>(
            `span.ball[data-index="${currentBallIdx()}"]`)!;
        currentBallEl.classList.add('highlighted');

        if (!currentBall) {
            return;
        }
        updateQuoteContent();
    })

    function updateQuoteContent() {
        const table = props.script.table;
        const triggerIndex = table.getTriggerIdxFromIdxInDivision(
            props.division, Number(currentBallIdx()));
        
        const triggerUuid = table.getTriggerFromIndex(triggerIndex);

        const trigger = props.script.resolveTriggerSync(triggerUuid);
        console.log('updateQuoteContent', triggerUuid, trigger);

        if (trigger !== null) {
            setQuoteContent(renderQuote(trigger, props.script));
            currentQuote.dataset.trigger = triggerIndex.toString();
        }
    }

    const balls =  
        Array.from(Array(props.script.table.amountTriggersInDivision(props.division)))
            .map((_, idx) => <span data-index={idx} class="ball"/>) as HTMLSpanElement[];
    
    onMount(() => {
        updateBallsFromIdx(props.currentTriggerIdx);

        document.addEventListener('pointercancel', onPointercancel);
        document.addEventListener('pointerout', onPointercancel)
        document.addEventListener('pointerleave', onPointercancel)
        document.addEventListener('pointerup', onPointercancel);
        document.addEventListener('pointermove', onPointermove);

        setTimeout(() => {
            updateQuoteContent();
            updateQuoteTop();
        });
    });

    onCleanup(() => {
        document.removeEventListener('pointercancel', onPointercancel);
        document.removeEventListener('pointerout', onPointercancel)
        document.removeEventListener('pointerleave', onPointercancel)
        document.removeEventListener('pointerup', onPointercancel);
        document.removeEventListener('pointermove', onPointermove);
    });

    function updateQuoteTop() {
        if (!currentBall) {
            return;
        }
        const rectB = currentBall.getBoundingClientRect();
        const rectQ = currentQuote.getBoundingClientRect();

        const myCurrentScaleFactor = Math.max(
            Number(currentBall.style.getPropertyValue('--ball-scale-factor')), 1);
        const centerY = rectB.top + (3.5 * myCurrentScaleFactor);
        const halfHeight = rectQ.height / 2;

        let top = Math.max(
            Math.min(centerY - halfHeight, window.innerHeight - (rectQ.height + 10)),
            60);
        currentQuote.style.top = `${top}px`;
    }

    function getAllScaleFactors(): number[] {
        const result: number[] = [];
        for (let ball of balls) {
            const myCurrentScaleFactor = Math.max(Number(ball.style.getPropertyValue('--ball-scale-factor')), 1);
            result.push(myCurrentScaleFactor);
        }
        return result;
    }

    let isPointerdown = false;
    async function onPointerdown(event: PointerEvent) {
        isPointerdown = true;
        await updateSmoothAnimate(() => updateBallsFromPos(event.clientY));
        updateQuoteTop();
    }

    function onPointermove(event: PointerEvent) {
        if (!isPointerdown) {
            return;
        }
        event.preventDefault();
        updateBallsFromPos(event.clientY);
        updateQuoteTop();
    }


    async function onPointercancel(event: PointerEvent) {
        console.log(event.type);
        if (!isPointerdown) {
            return;
        }
        isPointerdown = false;
        await updateSmoothAnimate(() => updateBallsFromIdx(currentBallIdx()));
        updateQuoteTop();
    }

    async function updateSmoothAnimate(updater: () => void): Promise<void> {
        const prevScaleFactors = getAllScaleFactors();
        updater();

        let idx = 0;
        let result: Promise<any>[] = [];
        for (let ball of balls) {
            const myCurrentScaleFactor = Math.max(Number(ball.style.getPropertyValue('--ball-scale-factor')), 1);
            if (prevScaleFactors[idx] === myCurrentScaleFactor) {
                idx++;
                continue;
            }
            const finished = ball.animate([
                { '--ball-scale-factor': prevScaleFactors[idx].toString() },
                { '--ball-scale-factor': myCurrentScaleFactor.toString() },
            ], { duration: 100 }).finished;
            result.push(finished);
            idx++;
        }

        await Promise.all(result);
    }

    let maxInfluence: number = undefined!
    let currentBall: HTMLSpanElement = undefined!
    function updateBallsFromPos(posY: number) {
        let minimum = 0;
        for (let ball of balls) {
            const rect = ball.getBoundingClientRect();
            const myCurrentScaleFactor = Math.max(Number(ball.style.getPropertyValue('--ball-scale-factor')), 1);
            const centerY = rect.top + (3.5 * myCurrentScaleFactor);
            const distanceY = Math.abs(posY - centerY) / maxInfluence;
            if (distanceY > 1) {
                ball.style.setProperty('--ball-scale-factor', null);
            } else {
                const scale = (Math.abs(distanceY - 1) * 3) + 1;
                ball.style.setProperty('--ball-scale-factor', `${scale}`);
                if (scale > 3.3) {
                    minimum = distanceY;
                    currentBall = ball;
                }
            }
        }
        
        setCurrentBallIdx(Number(currentBall.dataset.index));
    }

    function updateBallsFromIdx(currentBallIdx: number) {
        let idx = 0;
        for (let ball of balls) {
            const distanceB = Math.abs(currentBallIdx - idx) - 4;
            if (distanceB > -2) {
                ball.style.setProperty('--ball-scale-factor', null);
            } else {
                ball.style.setProperty('--ball-scale-factor', `${-distanceB}`);
            }

            idx++;
        }

        currentBall = ballsContainer.querySelector<HTMLSpanElement>(
            `span.ball[data-index="${currentBallIdx}"]`)!;
        let ballWithSmallestScaleFactor: HTMLSpanElement;
        let MAX_INFLUENCE = 3;
        if (currentBallIdx - MAX_INFLUENCE >= 0) { 
            ballWithSmallestScaleFactor = ballsContainer.querySelector<HTMLSpanElement>(
                `span.ball[data-index="${currentBallIdx - MAX_INFLUENCE}"]`)!;
        } else {
            ballWithSmallestScaleFactor = ballsContainer.querySelector<HTMLSpanElement>(
                `span.ball[data-index="${currentBallIdx + MAX_INFLUENCE}"]`)!;
        }

        const rectBC = currentBall.getBoundingClientRect();
        const rectB2 = ballWithSmallestScaleFactor.getBoundingClientRect();

        maxInfluence = Math.abs((rectBC.top + (3.5 * 4)) - (rectB2.top + (3.5 * 2)));
        console.log(maxInfluence);
    }

    function selectQuote() {
        if (!currentQuote.dataset.trigger) {
            return;
        }
        const triggerIndex = Number(currentQuote.dataset.trigger);
        if (triggerIndex !== props.currentTriggerIdx) {
            props.onTriggerSelected(triggerIndex);
        }
        router.goBack();
    }

    let ballsContainer: HTMLDivElement = undefined!;
    let currentQuote: HTMLDivElement = undefined!;
    return (
        <div class="vertical-view">
            <div class="content">
                <div class="simple-header">
                    <HeaderIconButton icon="arrow-left" onClick={() => router.goBack()}/>
                </div>
                <div class="balls" ref={ballsContainer} onPointerDown={e => onPointerdown(e)}>
                    { balls }
                </div>
                <div class="current-quote-container">
                    <div ref={currentQuote} class="current-quote">
                        { quoteContent() }
                        <RippleEffect color="#0f0f0f" alpha={1} onClick={() => selectQuote()}/>
                    </div>
                </div>
            </div>
        </div>
    ); 
}

function OverflowSafeView(props: DivisionScrollProps) {

    function openSubview() {
        props.script.prefetchDivision(props.division);
        router.pushFrame("triggers", () => {
            const root = document.getElementById('root')!;
            return createRoot(dispose => {
                onCleanup(() => {
                    root.children[root.children.length - 1].remove();
                })

                insert(root, <VerticalView {...props}/>);
                return dispose;
            });
        })
    }

    return (
        <div class="overflow-wrapper">
            <b class="blue" onClick={openSubview}>
                {props.currentTriggerIdx + 1}/{props.script.table.amountTriggersInDivision(props.division)}
            </b>
        </div>
    );
}
function shortenString(string: string|undefined): string {
    if (string === undefined) {
        return 'Leer';
    }

    string = string.split('\n')[0].trim();

    const splits = string.split(' ');
    const result: string[] = [];
    for (let split of splits) {
        if ([result, split].join(' ').length >= 32) {
            let string = result.join(' ');
            if (!string.endsWith('...')) {
                string += ' ...';
            }
            return string;
        }
        result.push(split.trim());
    }
    return string;
}

function renderQuote(trigger: Trigger, script: Script): JSX.Element {
    let ordinary = trigger.requestText.find(p => p.style === null)?.string;
    if (ordinary === undefined) {
        ordinary = trigger.requestText.find(p => p.style !== null)?.string;
    }
    ordinary = shortenString(ordinary);
    const actorsInfo = untrack(() => script.getActorsInfo(trigger.requestActorIds));
    const actorsInfo2 = actorsInfo !== null ? <h3>{ formatString(actorsInfo) }</h3> : null;
    const conf = trigger.confidence;
    return (
        <>
            { actorsInfo2 }
            { conf !== 0 ?
            <h3 style="float:right;color:#f9f871;margin-left:10px">
                <i class="bi bi-lightbulb-fill"/> {formatConfidence(conf)}</h3>
            : null}
            <span class="content">{ordinary}</span>
        </>
    );
}

function BallsView(props: DivisionScrollProps) {
    let element: HTMLDivElement = undefined!;
    let container: HTMLDivElement = undefined!;
    const [quoteContent, setQuoteContent] = createSignal<JSX.Element>(null);

    function getBallsAmount() {
        const n = props.script.table.amountTriggersInDivision(props.division);
        if (n < 3) {
            return 0;
        }
        return n;
    }


// Du bist der erste in diesem Abschnitt

    const balls = createMemo(() => 
        Array.from(Array(getBallsAmount()))
            .map((_, idx) => <span data-index={idx} class="ball"/>) as HTMLSpanElement[]
    );

    function updateIndex(currentIdx: number) {
        const prevBall = element.querySelector('.highlighted');
        if (prevBall) {
            prevBall.classList.remove('highlighted');
        }
        const currentBall = element.querySelector(`span[data-index="${currentIdx}"]`);
        if (currentBall) {
            currentBall.classList.add('highlighted');
        }
    }

    const mutationObserver = new MutationObserver(() => {
        updateIndex(props.currentTriggerIdx);
    })

    // let hammer: HammerManager = undefined!;
    onMount(() => {
        mutationObserver.observe(element, {
            childList: true
        });
        
        // hammer = new Hammer(container);
        // hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

        // hammer.on('pan', onPan);
        // hammer.on('panstart', onPanStart)
        // hammer.on('panend', onPanEnd)
        document.addEventListener('pointercancel', onPointercancel);
        document.addEventListener('pointerout', onPointercancel)
        document.addEventListener('pointerleave', onPointercancel)
        document.addEventListener('pointerup', onPointercancel);
        document.addEventListener('pointermove', onPointermove);
    })

    onCleanup(() => {
        document.removeEventListener('pointercancel', onPointercancel);
        document.removeEventListener('pointerout', onPointercancel)
        document.removeEventListener('pointerleave', onPointercancel)
        document.removeEventListener('pointerup', onPointercancel);
        document.removeEventListener('pointermove', onPointermove);
    })

    createEffect(() => {
        updateIndex(props.currentTriggerIdx);
    });

    let posX: number = undefined!;
    let currentQuote: HTMLDivElement = undefined!;
    let currentBall: HTMLSpanElement|undefined = undefined;
    let isPointerDown = false;
    function onPointermove(event: PointerEvent) {
        if (!isPointerDown) {
            return;
        }
        event.preventDefault();
        posX = event.clientX;

        currentBall = undefined;
        let minimum = 1;
        for (let ball of balls()) {
            const rect = ball.getBoundingClientRect();
            const myCurrentScaleFactor = Math.max(Number(ball.style.getPropertyValue('--ball-scale-factor')), 1);
            const centerX = rect.left + (3.5 * myCurrentScaleFactor);
            const distanceX = Math.abs(posX - centerX) / 58;
            if (distanceX > 1) {
                ball.style.setProperty('--ball-scale-factor', null);
            } else {
                const scale = (Math.abs(distanceX - 1) * 3) + 1;
                ball.style.setProperty('--ball-scale-factor', `${scale}`);
                if (scale > 3.3) {
                    minimum = distanceX;
                    currentBall = ball;
                }
            }
        }

        if (currentBall) {
            const ballRect = currentBall.getBoundingClientRect();
            const cRect = container.getBoundingClientRect();
            const ballMidPoint = ballRect.x + (ballRect.width / 2);

            const table = props.script.table;
            const triggerIndex = table.getTriggerIdxFromIdxInDivision(
                props.division, Number(currentBall.dataset.index));
            
            const triggerUuid = table.getTriggerFromIndex(triggerIndex);
            const currentTrigger = props.script.resolveTriggerSync(triggerUuid);

            if (currentTrigger !== null) {
                if (triggerIndex !== Number(currentQuote.dataset.trigger)) {
                    setQuoteContent(renderQuote(currentTrigger, props.script));
                    currentQuote.style.opacity = '0';
                    currentQuote.style.left = '0';
                    currentQuote.style.top = '0';
                    currentQuote.dataset.trigger = triggerIndex.toString();
                }
                setTimeout(() => {
                    const quoteRect = currentQuote.getBoundingClientRect();
                    const quoteMidPoint = quoteRect.width / 2;
                    const left = Math.min(
                        Math.max(ballMidPoint - quoteMidPoint, 10),
                        window.innerWidth - (quoteRect.width + 10)) // ballMidPoint - quoteMidPoint;

                    currentQuote.style.left = `${left}px`;
                    currentQuote.style.top = `${cRect.top - (cRect.height + quoteRect.height + 15)}px`;

                    setTimeout(() => {
                        currentQuote.style.opacity = '1';
                    })
                })
            }
        } else {
            currentQuote.style.opacity = '0';
            currentQuote.dataset.trigger = undefined;
        }
    }

    function onPointercancel() {
        if (!isPointerDown) {
            return;
        }
        isPointerDown = false;
        for (let ball of balls()) {
            const myCurrentScaleFactor = Math.max(Number(ball.style.getPropertyValue('--ball-scale-factor')), 1);
            if (myCurrentScaleFactor === 1) {
                continue;
            }
            ball.animate([
                { '--ball-scale-factor': myCurrentScaleFactor },
                { '--ball-scale-factor': 1 },
            ], { duration: 100 }).addEventListener('finish', () => {
                ball.style.setProperty('--ball-scale-factor', null);
                currentQuote.style.opacity = '0';
            })
        }

        currentQuote.style.opacity = '0';

        const triggerIndex = currentQuote.dataset.trigger;
        if (currentBall !== undefined && triggerIndex !== undefined) {
            props.onTriggerSelected(Number(triggerIndex));
        }
    }

    function onPointerdown(event: PointerEvent) {
        isPointerDown = true;
        onPointermove(event);
        onPointermove(event);
        for (let ball of balls()) {
            const myCurrentScaleFactor = Math.max(Number(ball.style.getPropertyValue('--ball-scale-factor')), 1);
            if (myCurrentScaleFactor === 1) {
                continue;
            }
            ball.animate([
                { '--ball-scale-factor': 1 },
                { '--ball-scale-factor': myCurrentScaleFactor },
            ], { duration: 100 })
        }

        props.script.prefetchDivision(props.division);
    }
    
    // document.addEventListener('pointerup', onPointermove);

    return (
        <div class="balls-view" ref={container} onPointerDown={e => onPointerdown(e)}>
            <div class="balls-container" ref={element}>
                { balls() }
            </div>
            <div class="current-quote-container">
                <div ref={currentQuote} class="current-quote">
                    { quoteContent() }
                </div>
            </div>
        </div>
    );
}

function WaitFor<T>(props: {
    waiter: () => PromiseLike<any>, 
    component: Component<T>,
    props: any
}) {
    const [resolved, setResolved] = createSignal(false);
    props.waiter().then(() => setResolved(true));

    return <>{resolved() ? <props.component {...props.props}/> : null}</>;
}

async function scriptsInitialized(): Promise<void> {
    if (ResourceManager.scriptsResource.updating.get()) {
        await ResourceManager.scriptsResource.updating;
    }
}

const loadDefaultScript = query(
    (uuid?: string) => {
        if (uuid === undefined) {
            return redirect("/script/12a4b830-4415-4c69-a2b8-69e595f33e2b");
        }
        return redirect(`/script/${uuid}`);
    },
    "getScriptByUuid"
);

function App(props: { children: JSX.Element }): JSX.Element {
    return (
        <>
            <HeaderElement showBackButton={false} title={''}>
            </HeaderElement>
            <div class="routing-contents">
                {props.children}
            </div>
        </>
    );
}

export default function() {
    return (
        <>
            <Router root={App}>
                <Route path="/" preload={() => loadDefaultScript()} />
                <Route path="/script/:uuid" component={ScriptView} />
            </Router>
        </>
    );
}


