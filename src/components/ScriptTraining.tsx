import { createSignal, onMount, onCleanup, JSX, createEffect, mapArray, Accessor, useContext, createMemo, Switch, Match, untrack, getOwner, runWithOwner } from 'solid-js';
import { useNavigate, A, useParams, Params } from '@solidjs/router';
import { Chart, ChartConfiguration, ChartData } from 'chart.js/auto';
import confetti from 'canvas-confetti';
import { useAuthentication, Division, Script } from '../backend';
import { ScriptContextObj, ScriptContext } from '../script';
import { progressBarGreen, progressBarYellow, progressBarOrange, progressBarRed, formatString, computeDivisionInfo, DivisionInfo } from './common';
import { renderCue } from './TextCueView';
import { DivisionInfoView } from './DivisionInfoView';

function easeOut(x: number) {
    return Math.sin((x * Math.PI) / 2);
    // return 1 - Math.pow(1 - t, 3); // close approximation
}

function animateScroll(element: HTMLElement, top: number, duration: number): Promise<void> {
    let resolve: () => void;
    const promise: Promise<void> = new Promise(resolve1 => { resolve = resolve1; });
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

function createFlyingScoreAnimation(
    view: HTMLDivElement,
    scoreString: Accessor<string>,
    progressBarColor: Accessor<string>
): Promise<void> {
    let resolve: () => void;
    const promise: Promise<void> = new Promise(resolve1 => { resolve = resolve1; });

    function calculateTranslationTo(sourceRect: DOMRect, targetRect: DOMRect): string {
        const relY = targetRect.top + (targetRect.height / 2) - (sourceRect.height / 2);
        const relX = targetRect.left  + (targetRect.width / 2) - (sourceRect.width / 2);

        return `translate(${relX}px, ${relY}px)`;
    }
    // const view = document.querySelector("div.script-view")!;
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
        { transform: `${finalTranslation} scale(9)`, color: progressBarColor(), offset: 1 },
    ], { duration: 500, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' });

    animation.addEventListener('finish', () => {
        scoreBox.classList.remove('hidden');
        flyingScore.remove();
        resolve();
    });

    return promise;
}

interface TrainingRunManager {
    addConfidenceRating(
        cueIdx: number,
        confidence: "low"|"medium"|"high"
    ): {
        diff: number,
        streak: number,
        trend: "dd"|"d"|"u"|"uu"|undefined
    };

    commitRun(): { 
        scoreHistory: number[],
        hasBorkenRecord: boolean,
    };
    readonly isLastDivision: boolean;

    reset(): void;
    next(): Promise<boolean>;
}

const trendIcons = {
    'uu': 'chevron-double-up',
    'u': 'chevron-up',
    'd': 'chevron-down',
    'dd': 'chevron-double-down',
};

const trendColors = {
    'uu': progressBarGreen,
    'u': progressBarGreen,
    'd': progressBarRed,
    'dd': progressBarRed,
};

function TrainingRunView(
    props: {
        division: Readonly<Division>,
        manager: TrainingRunManager
    }
) {
    const textCues = props.division.textCues;

    const [stickyDivisionVisible, setStickyDivisionVisible] = createSignal<boolean>(false);
    const [currentIndex, setCurrentIndex] = createSignal<number>(0);
    const [currentScore, setCurrentScore] = createSignal<number>(0);
    const [scoreString, setScoreString] = createSignal<string>(String(currentScore()));
    const [progressBarColor, setProgressBarColor] = createSignal<string>(progressBarGreen);
    const [reachedEnd, setReachedEnd] = createSignal<boolean>(false);
    const [scoreboxAnimationPromise, setScoreboxAnimationPromise] = createSignal<Promise<void>>();

    const maxScore = textCues.length * 4;
    const highScore = Math.max(maxScore, ...props.division.previousTotals);
    const [currentBarTotal, setCurrentBarTotal] = createSignal<number>(maxScore);

    const root = document.querySelector("div.routing-contents")! as HTMLElement;
    let view: HTMLDivElement;

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
                    setScoreboxAnimationPromise(createFlyingScoreAnimation(view, scoreString, progressBarColor));
            });
    }

    function scrollListener() {
        if (scrollLocked) return;
        if (root.scrollTop < (root.scrollHeight - root.offsetHeight)) {
            view.classList.add('free-scrolling');
        } else {
            view.classList.remove('free-scrolling');
        }
    }

    const observer = new IntersectionObserver(entries => {
        setStickyDivisionVisible(!entries[0].isIntersecting);
    }, { root });

    onMount(() => {
        // const view = document.querySelector("div.script-view")!;
        observer.observe(view.querySelector('h2')!);
        root.addEventListener('scroll', scrollListener);
    });

    onCleanup(() => {
        // const view = document.querySelector("div.script-view")!;
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

    function doTheFlyingIconThing(
        targetRect: DOMRect,
        sourceRect: DOMRect,
        diff: number,
        indicatorColor: string
    ): Animation {
        let flyingIcon = (
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

            const currentScore1 = currentScore();
            const currentBarTotal1 = currentBarTotal();
            if (currentScore1 > currentBarTotal1 && currentBarTotal1 < highScore)
                setCurrentBarTotal(highScore);

            const color = calculateBarColor(currentScore1);

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

        return animation;
    }

    async function reportConfidence(source: Element, confidence: "low"|"medium"|"high") {
        const { diff, streak, trend } = props.manager.addConfidenceRating(
            Math.floor(currentIndex() / 2), confidence);
        append();

        // const view = document.querySelector("div.script-view")!;
        const score = view.querySelector('h2.score')!;
        const targetRect = score.getBoundingClientRect();
        const indicatorColor = calculateIndicatorColor(diff);

        const parent = source.parentElement!;

        if (trend !== undefined) {
            const trendColor = trendColors[trend];
            parent.insertBefore(
                <i style={{ color: trendColor }} class={`bi bi-${trendIcons[trend]}`}/> as HTMLElement,
                parent.firstChild
            );
        }

        const x = formatString([{ style: { color: indicatorColor }, string: `+${diff}` }])[0] as any;
        parent.insertBefore(
            x,
            parent.firstChild);


        let sourceRect = x.getBoundingClientRect();

        let streakIndicator;
        if (streak > 0) {
            streakIndicator = (
                <span style={{ color: progressBarOrange }}>
                    <i class="bi bi-fire"/> { streak }
                </span>
            ) as HTMLElement,
            parent.insertBefore(
                streakIndicator,
                parent.firstChild
            );
        }

        let animation = doTheFlyingIconThing(targetRect, sourceRect, diff, indicatorColor);

        if (streak === 0)
            return;
        const streakPoints = calculatePointsForStreak(streak);

        await animation.finished;
        sourceRect = streakIndicator!.getBoundingClientRect();

        doTheFlyingIconThing(targetRect, sourceRect, streakPoints, progressBarOrange);
    }

    createEffect<number>(prev => {
        const current = currentScore();
        setProgressBarColor(calculateBarColor(current));
        createScoreAnimation(prev, current);
        return current;
    }, currentScore())

    function createScoreAnimation(start: number, end: number): Promise<void> {
        let resolve: () => void;
        const promise: Promise<void> = new Promise(resolve1 => { resolve = resolve1; });

        const effect: string[] = [];
        for (let c = start; c <= end; c++) {
            effect.push(String(c));
        }

        let currentIndex = 0;
        function advance() {
            if (currentIndex === effect.length - 1) {
                clearInterval(interval);
                resolve();
            }
            setScoreString(effect[currentIndex]);
            currentIndex++;
        }

        let interval = 0;
        advance();
        if (effect.length == 1)
            return promise;

        let delta = 75;
        if (effect.length - 1 > 4)
            delta = 300 /* ms */ / (effect.length - 1);

        interval = setInterval(advance, delta);
        return promise;
    }

    function renderQuote(n: number): JSX.Element {
        const type = n % 2 === 0 ? "request" : "response";
        const textCue = textCues[Math.floor(n / 2)];
        return renderCue(
            textCue[type],
            type,
            {
                get last() {
                    return checkIsLast(n, currentIndex());
                },
                get confidenceReport() {
                    return (n === currentIndex() && !reachedEnd()) 
                        ? reportConfidence
                        : undefined;
                },
                isRatable: type === "response"
            }
        );
    }

    async function visualViewReset(target: "next"|"top") {
        if (target === "top") {
            // const view = document.querySelector("div.script-view")!;
            const mainContent = view.querySelector("div.main-content")!;
            for (const childElement of mainContent.children) {
                const child = childElement as HTMLElement;
                child.style.visibility = 'hidden';
            }

            await animateScroll(root, 0, 350);

            setReachedEnd(false);
            setCurrentIndex(0);

            props.manager.reset();
        } else {
            const hasNext = await props.manager.next();
            if (!hasNext)
                return;
            await animateScroll(root, root.scrollHeight - root.offsetHeight, 350);
            view.remove();
            previousElement = null;
        }
    }

    return (
        <div ref={view} class="script-view">
            <span class="sticky-division" classList={{"visible": stickyDivisionVisible()}}>
                { props.division.name }
            </span>
            <div class="division-preamble">
                <h2>{ props.division.name }</h2>
                <DivisionInfoView division={props.division}/>
                <div style={{flex: 1, "min-height": "2.5rem"}}/>
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
                : <TrainingRunCompletedView maxScore={maxScore}
                    visualTransitionTo={visualViewReset}
                    currentScoreString={scoreString()}
                    manager={props.manager}
                    progressBarColor={progressBarColor()}
                    scoreboxAnimation={scoreboxAnimationPromise()}/>
            }
            <div class="controls">
                <div class="horizontal">
                    <h2 class="score">{ scoreString() }</h2>
                    <div 
                        class="progress"
                        style={{'--progress-width': Math.min(currentScore() / currentBarTotal(), 1),
                            '--progress-color': progressBarColor()}}>
                        <div class="inner"/>
                    </div>
                </div>
                <button disabled={currentIndex() % 2 === 1} class="primary-button" onClick={append}>Aufdecken</button>
            </div>
        </div>
    );
}

function leftPad(data: number[], length: number): number[] {
    if (data.length >= length)
        return data;
    const padding = Array(length - data.length).fill(0);
    return [...padding, ...data];
}

function createSubscribablePromise<T>(promise: Promise<T>, then: (x: T) => void): () => void {
    let canceled = false;
    promise.then(v => {
        if (!canceled)
            then(v);
    });
    return () => canceled = true;
}

function TrainingRunCompletedView(
    props: {
        maxScore: number,
        currentScoreString: string,
        progressBarColor: string,
        manager: TrainingRunManager,
        scoreboxAnimation: Promise<void>|undefined,
        visualTransitionTo: (target: "next"|"top") => void
    }
) {
    const { scoreHistory, hasBorkenRecord } = props.manager.commitRun();
    const highScore = Math.max(props.maxScore, ...scoreHistory);
    const [animationsDone, setAnimationsDone] = createSignal<boolean>(false);

    let unsubscribe: (() => void)|undefined;
    createEffect(() => {
        if (unsubscribe !== undefined)
            unsubscribe();
        if (props.scoreboxAnimation === undefined)
            return;
        unsubscribe = createSubscribablePromise(
            props.scoreboxAnimation,
            () => {
                setAnimationsDone(true);
            }
        );
    })

    createEffect(() => {
        if (!animationsDone() || !hasBorkenRecord) return;
        const creater = confetti.create(confettiCanvas, { resize: true });
        creater();
    })

    function chartConfigFactory(ctx: CanvasRenderingContext2D): ChartConfiguration {
        const scores = scoreHistory.slice(-7);
        const data = leftPad(scores, 7);
        const hightestRelativeScore = Math.max(props.maxScore, ...data);

        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0.35, 'rgba(227, 227, 227, 0)');
        gradient.addColorStop(1, 'rgba(227, 227, 227, 0.5)');

        const chartData: ChartData = {
            labels: ['1', '2', '3', '4', '5', '6', '7'],
            datasets: [
                {
                    data,
                    borderColor: '#e3e3e3',
                    backgroundColor: gradient,
                    fill: true
                }
            ]
        };

        return {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false,
                    },
                    title: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            title: () => [],
                            label(context) {
                                // Just return the value
                                return context.formattedValue;
                            }
                        }
                    },   
                },
                clip: 5,
                interaction: {
                    mode: 'nearest',
                    intersect: false
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        clip: false
                    },
                    y: {
                        min: 0,
                        max: hightestRelativeScore,
                        ticks: {
                            stepSize: props.maxScore / 4,
                        },
                        grid: {
                            color: '#252525',
                        }
                    }
                }
            },
        };
    }

    const confettiCanvas = <canvas id="confettiCanvas"/> as HTMLCanvasElement;

    return (
        <div class="division-training-end">
            <div class="scorebox hidden"
                style={{'--score-color': props.progressBarColor, '--max-score': `"${highScore}"`}}>
                { props.currentScoreString }
            </div>
            { animationsDone() ? <SimpleChart onConfig={chartConfigFactory}/> : null }
            { 
                animationsDone() && hasBorkenRecord
                    ? <h3><i class="bi bi-trophy-fill" style={{ color: progressBarYellow }}/> Neuer High Score!</h3>
                    : null
            }
            {
                !animationsDone() ?
                    null : (
                        <>
                            <div style={{'flex': 1}}/>
                            <div class="continuation-buttons">
                                <button class="primary-button" onClick={() => props.visualTransitionTo('next')}>
                                    {
                                        !props.manager.isLastDivision
                                            ? "Weiter"
                                            : "Zurück zur Übersicht"
                                    }
                                </button>
                                <button class="secondary-button" onClick={() => props.visualTransitionTo('top')}>
                                    Nochmal
                                </button>
                            </div>
                        </>
                    )
            }
            { confettiCanvas }
        </div>
    );
}

function ScriptOverview(
    props: {
        script: Readonly<Script>
    }
): JSX.Element {
    function computeScriptInfo(): DivisionInfo {
        let textCues = 0;
        const actorsSet: Set<string> = new Set();
        for (const division of props.script.divisions) {
            const { 
                actors: divisionActors,
                textCues: divisionTextCues,
            } = computeDivisionInfo(division);
            divisionActors.forEach(actorsSet.add.bind(actorsSet));
            textCues += divisionTextCues;
        }
        const actors = Array.from(actorsSet);
        actors.sort();

        return {
            actors,
            textCues
        };
    }
    
    const { actors, textCues } = computeScriptInfo();

    function renderDivision(division: Readonly<Division>, idx: Accessor<number>) {
        const { actors, textCues } = computeDivisionInfo(division);
        const highScore = Math.max(0, ...division.previousTotals);
        const maxScore = Math.max(division.textCues.length * 4, highScore);
        
        const previousTotals = division.previousTotals;
        const p1 = previousTotals.at(-1) ?? 0;
        const p2 = previousTotals.at(-2) ?? 0;

        let trendIcon: string;
        let trendColor: string|undefined;
        const delta = p1 - p2;
        const deltaString = `${Math.abs(delta)} pts`;
        if (delta < 0) {
            trendColor = progressBarRed;
            trendIcon = 'chevron-double-down'
        } else if (delta > 0) {
            trendColor = progressBarGreen;
            trendIcon = 'chevron-double-up'
        } else
            trendIcon = 'plus-slash-minus'

        function chartConfigFactory(ctx: CanvasRenderingContext2D): ChartConfiguration { 
            const data = leftPad(division.previousTotals, 3);
            const p1 = data.at(-1)!;
            const p2 = data.at(-2)!;

            let baseRBG;
            if (p1 < p2) {
                baseRBG = '250, 116, 44';
            } else {
                baseRBG = '93, 153, 72';
            }

            const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
            gradient.addColorStop(0, `rgba(${baseRBG}, 0.5)`);
            gradient.addColorStop(0.3, `rgba(${baseRBG}, 0)`);

            const chartData: ChartData = {
                labels: data.map((_, idx) => idx),
                datasets: [
                    {
                        data: data,
                        borderColor: `rgb(${baseRBG})`,
                        backgroundColor: gradient,
                        fill: true, 
                        borderWidth: 1
                    }
                ]
            };

            return {
                type: 'line',
                data: chartData,
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    elements: {
                        point: { radius: 0 },
                    },
                    plugins: {
                        legend: {
                            display: false,
                        },
                        title: {
                            display: false,
                        },
                        tooltip: {
                            enabled: false
                        },
                    },
                    interaction: undefined,
                    hover: { mode: undefined },
                    scales: {
                        x: {
                            display: false
                        },
                        y: {
                            display: false,
                            max: maxScore
                        }
                    }
                },
            };
        }

        return (
            <A class="division-info" href={`/script/${props.script.uuid}/${idx() + 1}`}>
                <div class="general-info">
                    <h3>{ division.name }</h3>
                    <span class="info">{ actors.length } Spieler</span>
                    <span class="info">{ textCues } Einsätze</span>
                </div>
                <SimpleChart onConfig={chartConfigFactory}/>
                <div class="score-info">
                    <span class="row" style={{ color: progressBarYellow }}>
                        <i class="bi bi-trophy-fill"/> { highScore }
                    </span>
                    <span class="row" style={{ color: trendColor }}>
                        <i class={`bi bi-${trendIcon}`}/> { deltaString }
                    </span>
                </div>
            </A>
        );
    }

    onMount(() => {
        document.title = `${props.script.name} - Quipt`
    })

    createEffect(() => {
        document.title = `${props.script.name} - Quipt`
    })

    return (
        <div class="script-overview">
            <div class="script-info">
                <h2>{ props.script.name }</h2>
                <span class="info">{ textCues } Einsätze</span>
                <span class="info">{ actors.join(', ') }</span>
            </div>
            {
                mapArray(() => props.script.divisions, renderDivision) as any
            }
        </div> 
    );
}

function SimpleChart(
    props: {
        onConfig: (ctx: CanvasRenderingContext2D) => ChartConfiguration
    }
): JSX.Element {

    const chartJSCanvas = <canvas class="chart-js"/> as HTMLCanvasElement;
    let chart: Chart|undefined;

    onMount(() => {
        const ctx = chartJSCanvas.getContext("2d")!;
        chart = new Chart(ctx, props.onConfig(ctx));
    })

    return <>{ chartJSCanvas }</>
}

export function MobileScriptRedirect(): JSX.Element {
    const params = useParams()
    const navigate = useNavigate()
    const authentication = useAuthentication()!;
    const scriptContext = useContext(ScriptContextObj)!;

    const x = createMemo(() => {
        if (params.uuid !== undefined && params.division !== undefined)
            return "training-run";
        else if (params.uuid !== undefined)
            return "script-overview";
        const [getScripts] = authentication.requests!.getCached("/list-scripts");
        if (!getScripts.loading && !getScripts.error) {
            const scripts = getScripts();
            if (scripts === undefined || scripts.length === 0) {
                navigate(`/no-script`);
                return;
            }
            const script = params.uuid ?? scripts
                .reduce((a, b) => a.createdAt > b.createdAt ? a : b)
                .uuid!;
            navigate(`/script/${script}`);
        }
        return "loading-redirect";
    });

    return (
        <Switch fallback={null}>
            <Match when={x() === "training-run"}>
                { scriptContext.instantiateDelayed(TrainingRunWrapper, () => navigate('/script')) }
            </Match>
            <Match when={x() === "script-overview"}>
                { scriptContext.instantiateDelayed(ScriptOverview, () => navigate('/script')) }
            </Match>
        </Switch>
    );
}

function calculatePointsForStreak(streak: number): number {
    return 0.5 * (streak**2 + streak);
}

function calculateStreakFromPoints(points: number): number {
    const a = 0.5;
    const b = 0.5;
    const c = -points;

    const discriminant = b**2 - 4 * a * c;
    if (discriminant < 0)
        throw 'unreachable';

    const s = Math.sqrt(discriminant);

    const x1 = (-b + s) / (2 * a);
    const x2 = (-b - s) / (2 * a);

    return Math.max(x1, x2);
}

let previousElement: JSX.Element = null;

function createTrainingRunManager(
    params: Params,
    scriptContext: ScriptContext,
    script: Readonly<Script>,
    resetState: () => void
): [TrainingRunManager, Readonly<Division>] {
    const navigate = useNavigate();
    const index = Number(params.division) - 1;
    const division = script.divisions[index];
    const newConfidences: number[] = Array(division.textCues.length).fill(0);
    let didCommitNewConfidences = false;
    const computationOwner = getOwner()!;

    const manager: TrainingRunManager = {
        addConfidenceRating(cueIdx, confidence) {
            let newScore = 0;
            switch(confidence) {
                case 'low':
                    newScore = 1;
                break;
                case 'medium':
                    newScore = 2;
                break;
                case 'high':
                    newScore = 4;
                break;
            }
            const diff = newScore;

            let streak = 0;
            let trend: "dd"|"d"|"u"|"uu"|undefined;
            const previousScore = division.textCues[cueIdx].previousScores.at(-1);
            if (previousScore === undefined) {
                newConfidences[cueIdx] = newScore;
                return { diff: newScore, streak: 0, trend }
            }

            const delta = newScore - previousScore;
            if (previousScore >= 4 && newScore === 4) {
                streak = calculateStreakFromPoints(previousScore - 4) + 1;
                newScore = 4 + calculatePointsForStreak(streak);
                trend = "uu";
            } else if (delta > 0 && delta <= 2)
                trend = "u";
            else if (delta < 0 && delta >= -2)
                trend = "d";
            else if (delta >= 3)
                trend = "uu";
            else if (delta <= -3)
                trend = "dd";
            newConfidences[cueIdx] = newScore;

            return { diff, streak, trend };
        },
        commitRun() {
            if (!didCommitNewConfidences) {
                didCommitNewConfidences = true;
                scriptContext.commitNewConfidences(index, newConfidences);
            }
            const newScore = newConfidences.reduce((a, b) => a + b);
            const previousHighScore = Math.max(...division.previousTotals);
            const scoreHistory = [...division.previousTotals, newScore];
            return {
                scoreHistory,
                hasBorkenRecord: newScore > previousHighScore
            };
        },
        reset() {
            resetState();
        },
        next() {
            if (this.isLastDivision) {
                window.history.back();
                return Promise.resolve(false);
            }
            let resolve: (x: boolean) => void;
            const promise = new Promise<boolean>(resolve1 => resolve = resolve1);

            previousElement = document.querySelector('div.script-view');
            const nextDivision = index + 2;
            let didResetState = false;
            navigate(`/script/${script.uuid}/${nextDivision}`, { replace: true });
            runWithOwner(computationOwner, () => createEffect(() => {
                if (Number(params.division) === nextDivision && !didResetState) {
                    didResetState = true;
                    resetState(); 
                    resolve(true);
                }
            }));

            return promise;
        },
        get isLastDivision() {
            return index === script.divisions.length - 1;
        },
    };

    return [manager, division];
}

function createInvalidatable<T>(fn: Accessor<T>): [Accessor<T>, () => void] {
    const [pullSignal, setSignal] = createSignal({});

    const read = createMemo(() => {
        pullSignal();
        return untrack(fn);
    });

    return [read, () => setSignal({})];
}

function TrainingRunWrapper(
    props: {
        script: Readonly<Script>
    }
): JSX.Element {
    const params = useParams();
    const scriptContext = useContext(ScriptContextObj)!;

    const [element, invalidate] = createInvalidatable(() => {
        const [manager, division] = createTrainingRunManager(
            params,
            scriptContext,
            props.script,
            () => invalidate()
        );
        return (
            <>
                { previousElement }
                <TrainingRunView division={division} manager={manager} />
            </>
        );
    });

    onMount(() => {
        document.title = `${props.script.name} - Quipt`
    })

    createEffect(() => {
        document.title = `${props.script.name} - Quipt`
    })

    return (
        <>
            { element() }
        </>
    );
}

