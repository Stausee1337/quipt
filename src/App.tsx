import './App.scss'
import { createSignal, onMount, onCleanup, JSX, createEffect, mapArray } from 'solid-js';
import { HeaderElement } from './std-widgets';
import { Router, Route } from '@solidjs/router';


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

function ScriptView() {
    const root = document.getElementById("root")!;

    // const params = useParams<{ uuid: string }>();
    // const script = ResourceManager.scriptsResource.findByUUID(params.uuid)!;



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

    function scrollListener() {
        if (scrollLocked) return;
        const view = document.querySelector("div.script-view")!;
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
        const view = document.querySelector("div.script-view")!;
        observer.observe(view.querySelector('h2')!);
        root.addEventListener('scroll', scrollListener);
    });

    onCleanup(() => {
        const view = document.querySelector("div.script-view")!;
        observer.unobserve(view.querySelector('h2')!);
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
                return progressBarRed;
            case 2:
                return progressBarYellow;
            default:
                return progressBarGreen;
        }
    }

    function calculateBarColor(score: number): string {
        const p = score / maxPoints;
        if (p > 1)
            return progressBarGreen;
        else if (p >= 0.5)
            return progressBarYellow;
        else if (p >= 0.1)
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
                    mapArray<number, JSX.Element>(
                        () => Array.from({ length: length() - 1 }, (_, index) => index + 1),
                        n => <QuoteView 
                             last={checkIsLast(n, length())}
                             type={n % 2 === 0 ? "request" : "response"}
                             confidenceReport={n === length() - 1 ? reportConfidence : undefined}
                             text={[{ style: null, string:"This is some crazy Text! I hope you can remember it" }]}
                             actorsInfo={n % 2 !== 0 ? null : [{ style: null, string: "Your Mom" }]}/>)()
                }
            </div>
            <div class="scroll-padding"/>
            <div class="controls">
                <div class="horizontal">
                    <h2 class="score">{ scoreString() }</h2>
                    <div 
                        class="progress"
                        style={{'--progress-width': Math.min(currentScore() / maxPoints, 1),
                            '--progress-color': progressBarColor()}}>
                        <div class="inner"/>
                    </div>
                </div>
                <button disabled={length() % 2 === 0} class="primary-button" onClick={append}>Aufdecken</button>
            </div>
        </div>
    );
}

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


