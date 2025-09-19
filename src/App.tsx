import './App.scss'
import { createSignal, onMount, onCleanup, JSX, createEffect, mapArray, Accessor, createContext, useContext, createMemo, Switch, Match, Component, createResource } from 'solid-js';
import { HeaderElement, MenuElement } from './std-widgets';
import { Router, Route, Navigate, useNavigate, RouteSectionProps, A, useParams, useLocation, useIsRouting } from '@solidjs/router';
import { AuthenticationContextObj, createAuthenticationContext, useAuthentication, defaultRequests, auth, scripts, Division, Script, AuthenticationContext, TextCue } from './backend';
import { FormattedString } from './resources';

type QuoteViewProps = {
    last: boolean,
    text: FormattedString,
    actorsInfo: FormattedString|null,
    type: "request"|"response",
    isTextShown?: boolean,
    onShowText?: () => void,
    confidenceReport?: (source: EventTarget & Element, confidence: "low"|"medium"|"high") => void
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
    return (
        <div class="quote-wrapper">
            <div class={`quote ${props.type}`} 
                classList={{'last': props.last}}>
                { props.actorsInfo !== null ? <h3>{ formatString(props.actorsInfo) }</h3> : null }
                <span class="content">
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

function easeOut(x: number) {
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

function xxx(scoreString: Accessor<string>, progressBarColor: Accessor<string>) {
    function calculateTranslationTo(sourceRect: DOMRect, targetRect: DOMRect): string {
        const relY = targetRect.top + (targetRect.height / 2) - (sourceRect.height / 2);
        const relX = targetRect.left  + (targetRect.width / 2) - (sourceRect.width / 2);

        return `translate(${relX}px, ${relY}px)`;
    }
    const view = document.querySelector("div.script-view")!;
    const score = view.querySelector('h2.score')! as HTMLElement;
    const scoreBox = view.querySelector('div.scorebox')! as HTMLElement;
    
    const flyingScore = (<h2 class="flying-score">{scoreString()}</h2>) as HTMLHeadingElement;
    document.body.append(flyingScore);

    const initalTargetRect = score.getBoundingClientRect();
    const finalTargetRect = scoreBox.getBoundingClientRect();

    const sourceRect = flyingScore.getBoundingClientRect();
    const initialTranslation = calculateTranslationTo(sourceRect, initalTargetRect);
    const finalTranslation = calculateTranslationTo(sourceRect, finalTargetRect);

    flyingScore.style.transform = `${finalTranslation} scale(10)`;
    flyingScore.style.color = progressBarColor();

    const animation = flyingScore.animate([
        { transform: initialTranslation, offset: 0 },
        { transform: `${finalTranslation} scale(10)`, color: progressBarColor(), offset: 1 },
    ], { duration: 500, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' });

    animation.addEventListener('finish', () => {
        scoreBox.classList.remove('hidden');
        flyingScore.remove();
    });
}

interface DivisionInfo {
    actors: string[],
    textCues: number
}

function computeDivisionInfo(division: Division): DivisionInfo {
    const actorsCollection: Set<string> = new Set();
    const addActors = (textCue: TextCue) => textCue.actors.forEach(actorsCollection.add.bind(actorsCollection))
    for (const textCuePair of division.textCues) {
        if (textCuePair.request !== null)
            addActors(textCuePair.request);
        addActors(textCuePair.response);
    }

    const actors = Array.from(actorsCollection);
    actors.sort();
    return {
        actors,
        textCues: division.textCues.length
    };
}

function TrainingRunView(
    props: {
        division: Readonly<Division>
    }
) {
    const textCues = props.division.textCues;

    const [stickyDivisionVisible, setStickyDivisionVisible] = createSignal<boolean>(false);
    const [currentIndex, setCurrentIndex] = createSignal<number>(0);
    const [currentScore, setCurrentScore] = createSignal<number>(0);
    const [scoreString, setScoreString] = createSignal<string>(String(currentScore()));
    const [progressBarColor, setProgressBarColor] = createSignal<string>(progressBarGreen);
    const [reachedEnd, setReachedEnd] = createSignal<boolean>(false);
    const maxScore = textCues.length * 4;
    const info = computeDivisionInfo(props.division);

    const root = document.getElementById("root")!;

    let scrollLocked = false;
    function append() {
        const prev = root.scrollTop;
        const currentIdx = currentIndex();
        if (currentIdx < textCues.length * 2 - 1)
            setCurrentIndex(currentIdx + 1);
        else
            setReachedEnd(true);

        root.scrollTop = prev;

        scrollLocked = true;
        animateScroll(root, root.scrollHeight - root.offsetHeight, 250)
            .then(() => {
                scrollLocked = false;

                if (reachedEnd())
                    xxx(scoreString, progressBarColor);
            });
    }

    function scrollListener() {
        if (scrollLocked) return;
        const view = document.querySelector("div.script-view")!;
        if (root.scrollTop !== (root.scrollHeight - root.offsetHeight)) {
            view.classList.add('free-scrolling');
        } else {
            view.classList.remove('free-scrolling');
        }
    }


    const observer = new IntersectionObserver(entries => {
        setStickyDivisionVisible(!entries[0].isIntersecting);
    }, { root });

    onMount(() => {
        const view = document.querySelector("div.script-view")!;
        observer.observe(view.querySelector('h2')!);
        root.addEventListener('scroll', scrollListener);
    });

    onCleanup(() => {
        const view = document.querySelector("div.script-view");
        observer.unobserve(view.querySelector('h2')!);
        root.removeEventListener('scroll', scrollListener);
    });

    function checkIsLast(n: number, lastIndex: number): boolean {
        return Math.floor(n / 2) === Math.floor(lastIndex / 2);
    }

    function calculateIndicatorColor(score: number): string {
        switch (score) {
            case 1:
                return progressBarRed;
            case 2:
                return progressBarYellow;
            default:
                return progressBarGreen;
        }
    }

    function calculateBarColor(score: number): string {
        const p = score / maxScore;
        if (p > 1)
            return progressBarGreen;
        else if (p > 0.5)
            return progressBarYellow;
        else if (p > 0.25)
            return progressBarOrange;
        return progressBarRed;
    }

    function reportConfidence(source: HTMLElement, confidence: "low"|"medium"|"high") {
        let diff = 0;
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

        const view = document.querySelector("div.script-view")!;
        const score = view.querySelector('h2.score')!;
        const targetRect = score.getBoundingClientRect();
        const sourceRect = source.getBoundingClientRect();
        const indicatorColor = calculateIndicatorColor(diff);

        const parent = source.parentElement!;
        parent.insertBefore(
            formatString([{ style: { color: indicatorColor }, string: `+${diff}` }])[0],
            parent.firstChild);

        const flyingIcon = (
            <span
                class="flying-icon"
                style={{ top: `${sourceRect.top}px`, left: `${sourceRect.left}px`, color: indicatorColor }}>
                +{diff}
            </span>) as HTMLSpanElement;
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

            const bubble = <span
                class="score-ripple-bubble"
                style={{ top: `${coordY}px`, left: `${coordX}px`, '--bubble-color': color }}/> as HTMLSpanElement;
            bubble.addEventListener('animationend', () => {
                bubble.remove();
            });
            document.body.appendChild(bubble);
        });
    }

    createEffect<number>(prev => {
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

        let interval = 0;
        advance();
        if (effect.length > 1)
            interval = setInterval(advance, 75);
    }

    function renderQuote(n: number): JSX.Element {
        const type = n % 2 === 0 ? "request" : "response";
        const textCue = textCues[Math.floor(n / 2)];
        const cueData = type === "request" 
            ? { actors: [{ string: textCue.request?.actors, style: null }], text: textCue.request?.text ?? "Du bist der erste in diesem Abschnitt" }
            : { actors: [{ string: textCue.response!.actors, style: null }], text: textCue.response!.text! };
        return (
            <QuoteView 
                last={checkIsLast(n, currentIndex())}
                type={type}
                confidenceReport={n === currentIndex() ? reportConfidence : undefined}
                text={[{ style: null, string: cueData.text }]}
                actorsInfo={cueData.actors}/>);
    }

    return (
        <div class="script-view">
            <span class="sticky-division" classList={{"visible": stickyDivisionVisible()}}>
                { props.division.name }
            </span>
            <div class="division-preamble">
                <h2>{ props.division.name }</h2>
                <div class="division-info-wrapper">
                    <div class="division-info">
                        <span class="info">{ info.actors.join(', ') } · { info.textCues } Einsätze</span>
                        <span class="content">
                            { formatString([{ style: null, string: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas lacus nunc, ornare sed felis sit amet, laoreet sagittis enim. Fusce eu felis ultricies, tempor dui sed, elementum diam." }]) }
                        </span>
                    </div>
                </div>
                <div style={{flex: 1}}/>
                { renderQuote(0) }
            </div>
            <div class="main-content">
                { 
                    mapArray<number, JSX.Element>(
                        () => Array.from({ length: currentIndex() }, (_, index) => index + 1),
                        renderQuote)
                }
            </div>
            { !reachedEnd() 
                ? <div class="scroll-padding"/> 
                : (<div class="division-training-end"><div class="scorebox hidden" style={{'--score-color': progressBarColor(), '--max-score': `"${maxScore}"`}} children={currentScore()}/></div>) 
            }
            <div class="controls">
                <div class="horizontal">
                    <h2 class="score">{ scoreString() }</h2>
                    <div 
                        class="progress"
                        style={{'--progress-width': Math.min(currentScore() / maxScore, 1),
                            '--progress-color': progressBarColor()}}>
                        <div class="inner"/>
                    </div>
                </div>
                <button disabled={currentIndex() % 2 === 1} class="primary-button" onClick={append}>Aufdecken</button>
            </div>
        </div>
    );
}

const IsMobileContext = createContext<() => boolean>();

function App(props: { children: JSX.Element }): JSX.Element {
    const authenticationContext = useAuthentication()!;
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = createSignal(window.innerWidth <= 768);
    const scriptContext = createScriptContext(authenticationContext);

    const unsubscribe = authenticationContext.onLogout.subscribe(() => navigate('/signin'));
    onCleanup(() => {
        unsubscribe();
    });

    const mql = window.matchMedia("(max-width: 768px)");
    mql.addEventListener('change', () => {
        setIsMobile(window.innerWidth <= 768);
    });

    createEffect(() => {
        const root = document.querySelector('#root')!;
        if (!isMobile() && authenticationContext.isLoggedIn())
            root.classList.add('sidebar-visible');
        else
            root.classList.remove('sidebar-visible');
    })

    return (
        <IsMobileContext.Provider value={isMobile}>
            <ScriptContextObj.Provider value={scriptContext}>
                { 
                    isMobile() 
                        ? <HeaderElement showBackButton={false} title={''}/> 
                        : ( authenticationContext.isLoggedIn() && <MenuElement/> )
                }
                <div class="routing-contents">
                    {props.children}
                </div>
            </ScriptContextObj.Provider>
        </IsMobileContext.Provider>
    );
}

function Root(): JSX.Element {
    const authentication = useAuthentication()!;
    return (
        <>
            {authentication.isLoggedIn() ? <Navigate href="/script"/> : <Navigate href="/signin"/>}
        </>
    );
}

function ScriptRoute(): JSX.Element {
    const isMobile = useContext(IsMobileContext)!;

    return (
        <>
            { isMobile() ? <MobileScriptRedirect/> : null }
        </>
    );
}

function MobileScriptRedirect(): JSX.Element {
    const params = useParams()
    const navigate = useNavigate()
    const authentication = useAuthentication()!;
    const scriptContext = useContext(ScriptContextObj)!;

    const x = createMemo(() => {
        if (params.uuid !== undefined && params.division !== undefined)
            return "training-run";
        else if (params.uuid !== undefined)
            return "script-overview";
        const [scripts] = authentication.requests!.getCached("/list-scripts");
        if (!scripts.loading && !scripts.error) {
            const script = params.uuid ?? scripts()![0].uuid!;
            navigate(`/script/${script}`);
        }
        return "loading-redirect";
    });

    return (
        <Switch fallback={null}>
            <Match when={x() === "training-run"}>
                { scriptContext.instantiateDelayed(TrainingRunWrapper) }
            </Match>
            <Match when={x() === "script-overview"}>
                { scriptContext.instantiateDelayed(ScriptOverview) }
            </Match>
        </Switch>
    );
}

function TrainingRunWrapper(
    props: {
        script: Script
    }
): JSX.Element {
    const params = useParams();
    const index = Number(params.division) - 1;
    console.log(index);
    return <TrainingRunView division={props.script.divisions[index]}/>
}

function ScriptOverview(
    props: {
        script: Script
    }
): JSX.Element {

    function renderDivision(division: Division, idx: Accessor<number>) {

        return (
            <A class="division-info" href={`/script/${props.script.uuid}/${idx() + 1}`}>
                <div class="general-info">
                    <h3>{ division.name }</h3>
                    <span class="info">4 Spieler</span>
                    <span class="info">25 Einsätze</span>
                </div>
            </A>
        );
    }

    return (
        <div class="script-overview">
            <h2>{ props.script.name }</h2>
            {
                mapArray(() => props.script.divisions, renderDivision) as any
            }
        </div> 
    );
}


export const ScriptContextObj = createContext<ScriptContext>();

interface ScriptContext {
    readonly currentScript: string|undefined;
    instantiateDelayed(component: Component<{ script: Script }>): JSX.Element;
}

function createScriptContext(authenticationContext: AuthenticationContext): ScriptContext {
    const location = useParams();
    const [currentScriptId, setCurrentScriptId] = createSignal<string|undefined>(location.uuid);
    const scriptCache: Map<string, Script> = new Map();

    const [currentScript, { refetch }] = createResource(async () => {
        const currentId = currentScriptId();
        if (currentId === undefined)
            return undefined;
        let currentScript = scriptCache.get(currentId);
        if (currentScript !== undefined)
            return currentScript;
        const [script, error] = await authenticationContext.requests!.getParametrized("/script", currentId)
        if (error !== undefined) {
            setCurrentScriptId(undefined);
            throw `could not get script: ${error}`;
        }
        currentScript = script as Script;
        scriptCache.set(currentId, currentScript);
        return currentScript;
    });

    createEffect(() => {
        setCurrentScriptId(location.uuid); 
        refetch();
    });

    return {
        get currentScript() {
            return currentScriptId();
        },
        instantiateDelayed(Component) {
            return (
                <>
                    {
                        currentScript.state === "ready" && currentScript() !== undefined
                            ? <Component script={currentScript()!}/>
                            : null
                    }
                </>
            );
        },
    };
}

class QuiptFormEvent extends Event {
    constructor(
        public valid: boolean,
        public formData: Record<string, string>
    ) {
        super('quiptsubmit');
    }
}

class QuiptInputEvent extends Event {
    constructor(
        public kind: 'quiptvalidationchange',
        public value: string,
        public valid: boolean,
        public message: string|undefined
    ) {
        super(kind);
    }

}

declare global {
interface HTMLElementEventMap {
    'quiptsubmit': QuiptFormEvent,
    'еееInputChange': Event & { еееValue: string, еееValid: boolean },
}
}

interface FormData {
    data: Record<string, string>;
    valid: boolean;
    submitted: boolean;
    readonly error: string|undefined;
    blur(name?: string): void;
    focus(name: string): void;
    resetInput(name?: string): void;
    postErrorMessage(message: string): void;
}

function createReactiveFormData(): FormData {
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

function quiptForm(element: HTMLFormElement, formData: Accessor<FormData>) {
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

interface Validator {
    validate(v: string): boolean;
    message: string
}

function quiptValidator(element: HTMLInputElement, validataors: Accessor<Validator | Validator[]>) {
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

namespace validators {
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

function convertErrorToMessage(error: auth.AuthError): string {
    switch (error.code) {
        case auth.AuthErrorCode.INVALID_CREDENTIALS:
            return 'Benuzername order Passwort ist falsch'
        case auth.AuthErrorCode.USERNAME_MALFORMED:
            return 'Benuzername kann nicht vergeben werden'
        case auth.AuthErrorCode.USERNAME_ALREADY_EXISTS:
            return 'Der Benuzername exsitiert bereits'
        case auth.AuthErrorCode.WEAK_PASSWORD:
            return 'Das Passwort ist zu schwach'
    }
    throw 'unreachable'
}

const passwordRegex = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[a-z])(?=.*[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]).+$/;
const regexError = 'Passwort muss mindestens einen Groß- sowie Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten';

function UserAuthenticate(
    props: RouteSectionProps
): JSX.Element {
    const navigate = useNavigate()!;
    const authentication = useAuthentication()!;
    const [loading, setLoading] = createSignal(false);

    const keys: Record<string, string> = {
        '/signin': 'Anmelden',
        '/signup': 'Quipt Konto erstellen'
    };
    async function onSubmit(e: QuiptFormEvent) {
        if (!e.valid) {
            return;
        }

        const currentFormData = formData();
        setLoading(true);
        currentFormData.blur();

        const endpoint: "/auth/signin"|"/auth/signup" = props.location.pathname === '/signin'
            ? "/auth/signin"
            : "/auth/signup";
        const [success, error] = await defaultRequests.post(endpoint, {
            username: e.formData['username'] ?? '',
            password: e.formData['password'] ?? ''
        })

        setLoading(false);

        if (error !== undefined) {
            currentFormData.postErrorMessage(convertErrorToMessage(error));
            const input = props.location.pathname === '/signin'
                ? 'password'
                : 'username';
            currentFormData.resetInput(input);
            currentFormData.focus(input);
            return;
        }

        authentication.loginUser(success);
        navigate('/');
    }

    const [formData, setFormData] = createSignal(createReactiveFormData());

    const content = createMemo<JSX.Element>(() => {
        setFormData(createReactiveFormData());
        if (props.location.pathname === '/signin') {
            const [userMessage, setUserMeessage] = createSignal<string>();
            const [passwordMessage, setPasswordMessage] = createSignal<string>();
            return (
                <>
                    <div class="input-box">
                        <input type="text"
                            name="username"
                            placeholder="Benutzername"
                            onQuiptValidationChange={e => setUserMeessage(e.message)}
                            use:quiptValidator={[validators.required]}/>
                        <span class="error-message">{ userMessage() }</span>
                    </div>
                    <div class="input-box">
                        <input type="password"
                            name="password"
                            placeholder="Passwort"
                            onQuiptValidationChange={e => setPasswordMessage(e.message)}
                            use:quiptValidator={[validators.required]}/>
                        <span class="error-message">{ passwordMessage() }</span>
                    </div>
                    <span class="error-message">{ formData().error }</span>
                    <p>Du hat noch kein Konto? <A href="/signup">Jetzt eins erstellen!</A></p>
                    <button class="primary-button"
                        disabled={!formData().valid && formData().submitted}>
                        Anmelden
                    </button>
                </>
            );
        } else {
            const [userMessage, setUserMeessage] = createSignal<string>();
            const [passwordMessage, setPasswordMessage] = createSignal<string>();
            const [password2Message, setPassword2Message] = createSignal<string>();
            return (
                <>
                    <div class="input-box">
                        <input type="text"
                            placeholder="Benutzername"
                            name="username"
                            onQuiptValidationChange={e => setUserMeessage(e.message)}
                            use:quiptValidator={[validators.required, validators.minLength(3)]}/>
                        <span class="error-message">{ userMessage() }</span>
                    </div>
                    <div class="input-box">
                        <input type="password"
                            placeholder="Passwort"
                            name="password"
                            onQuiptValidationChange={e => setPasswordMessage(e.message)}
                            use:quiptValidator={[validators.required, validators.lengthRange(8, 72), validators.regex(passwordRegex, regexError)]}/>
                        <span class="error-message">{ passwordMessage() }</span>
                    </div>
                    <div class="input-box">
                        <input type="password"
                            placeholder="Passwort wiederholen"
                            name="password2"
                            onQuiptValidationChange={e => setPassword2Message(e.message)}
                            use:quiptValidator={[validators.equal(() => formData().data['password'], 'Passwort')]}/>
                        <span class="error-message">{ password2Message() }</span>
                    </div>
                    <span class="error-message">{ formData().error }</span>
                    <p>Du bist bereits bei Quipt? <A href="/signin">Anmelden!</A></p>
                    <button class="primary-button"
                        disabled={!formData().valid && formData().submitted}>
                        Registrieren
                    </button>
                </>
            );
        }
    });

    return (
        <form class="auth-box"
            classList={{'interactable': !loading()}}
            use:quiptForm={formData()}
            onQuiptSubmit={onSubmit}>
            <h2>{ keys[props.location.pathname] }</h2>
            { content() }
        </form>
    );
}

export default function() {
    const authenticationContext = createAuthenticationContext();
    return (
        <AuthenticationContextObj.Provider value={authenticationContext}>
            <Router root={App}>
                <Route path="/" component={Root}/>
                {
                    !authenticationContext.isLoggedIn()
                        ? <Route path={["/signin", "/signup"]} component={UserAuthenticate}/>
                        : <Route path={["/script", "/script/:uuid", "/script/:uuid/:division"]} component={ScriptRoute} />
                }
                <Route 
                    path="*paramName"
                    component={() => <Navigate href="/"/>}/>
            </Router>
        </AuthenticationContextObj.Provider>
    );
}


