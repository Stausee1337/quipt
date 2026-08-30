import {
    Accessor,
    For,
    JSX,
    Owner,
    createEffect,
    createMemo,
    createRoot,
    createSignal,
    getOwner,
    onCleanup,
    onMount,
    splitProps,
} from 'solid-js';

import { useQuery } from '@tanstack/solid-query';
import confetti from 'canvas-confetti';
import { ChartConfiguration, ChartData } from 'chart.js/auto';
import { schemas } from 'qrpc-js';

import { DivisionInfoView } from 'quipt/components/DivisionInfoView';
import { TextCueView as BaseTextCueView } from 'quipt/components/TextCueView';
import {
    DivisionInfo,
    FormattedStringView,
    SimpleChart,
    computeDivisionInfo,
    leftPad,
    progressBarGreen,
    progressBarOrange,
    progressBarRed,
    progressBarYellow,
} from 'quipt/components/common';
import { Script } from 'quipt/schemas';
import { Button, useScrollContainer } from 'quipt/components/basics';

type Confidence = 'low' | 'medium' | 'high';
type OnConfidenceReportHandler = (confidence: Confidence) => void;
type Trend = 'uu' | 'u' | 'd' | 'dd';

type ConfidenceInfo = {
    diff: number;
    streak: number;
    trend: Trend | undefined;
};

// I think TextCue is small enough to mirror it here for now
interface TextCueBase {
    text?: string;
    actors?: string[];
    type: 'request' | 'response';
}
interface RequestTextCue extends TextCueBase {
    type: 'request';
}

interface ResponseTextCue extends TextCueBase {
    text: string;
    actors: string[];
    previousScores: number[];
    type: 'response';
}

type TextCue = RequestTextCue | ResponseTextCue;

function ConfidenceReportButton(props: {
    confidence: Confidence;
    onConfidenceReport: OnConfidenceReportHandler;
    isActive: boolean;
}): JSX.Element {
    const confidenceIconColor = {
        low: 'text-pgb-red',
        medium: 'text-pgb-yellow',
        high: 'text-pgb-green',
    };

    const confidenceIconMap = {
        low: 'frown',
        medium: 'neutral',
        high: 'smile',
    };

    const icon = () => `emoji-${confidenceIconMap[props.confidence]}${props.isActive ? '-fill' : ''}`

    return (
        <i
            class={`bi bi-${icon()} w-8 h-8 text-[32px]/1 ${confidenceIconColor[props.confidence]} cursor-pointer block`}
            onClick={() => props.onConfidenceReport(props.confidence)}/>
    );
}

const TREND_ICONS = {
    uu: 'chevron-double-up',
    u: 'chevron-up',
    d: 'chevron-down',
    dd: 'chevron-double-down',
};

const TREND_COLORS = {
    uu: progressBarGreen,
    u: progressBarGreen,
    d: progressBarRed,
    dd: progressBarRed,
};

function ConfidenceReportView(props: {
    diff: number | undefined;
    trend: Trend | undefined;
    streak: number | undefined;
    onConfidenceReport: OnConfidenceReportHandler;
}): JSX.Element {
    const [currentConfidence, setCurrentConfidence] = createSignal<Confidence>();

    function onConfidenceReport(confidence: Confidence) {
        if (currentConfidence()) return;
        setCurrentConfidence(confidence);
        props.onConfidenceReport(confidence);
    }

    const indicatorColor = createMemo(() =>
        props.diff ? calculateIndicatorColor(props.diff) : undefined,
    );

    return (
        <div class="flex items-center justify-end gap-2 text-sm">
            {props.streak && (
                <span style={{ color: progressBarOrange }}>
                    <i class="bi bi-fire" /> {props.streak}
                </span>
            )}
            {props.trend && (
                <i
                    class={`bi bi-${TREND_ICONS[props.trend]}`}
                    style={{ color: TREND_COLORS[props.trend] }}
                />
            )}
            {props.diff && (
                <FormattedStringView
                    string={[
                        {
                            style: { color: indicatorColor() },
                            string: `+${props.diff}`,
                        },
                    ]}
                />
            )}
            <ConfidenceReportButton
                confidence="low"
                isActive={currentConfidence() === 'low'}
                onConfidenceReport={onConfidenceReport}
            />
            <ConfidenceReportButton
                confidence="medium"
                isActive={currentConfidence() === 'medium'}
                onConfidenceReport={onConfidenceReport}
            />
            <ConfidenceReportButton
                confidence="high"
                isActive={currentConfidence() === 'high'}
                onConfidenceReport={onConfidenceReport}
            />
        </div>
    );
}

function TextCueView(props: JSX.HTMLAttributes<HTMLDivElement> & {
    idx: number;
    currentIdx: number;
    textCues: TextCue[];
    onConfidenceUpdate?: (info: ConfidenceInfo) => void;
}): JSX.Element {
    const [, rest] = splitProps(props, ['idx', 'currentIdx', 'textCues', 'onConfidenceUpdate']);
    const [diff, setDiff] = createSignal<number>();
    const [trend, setTrend] = createSignal<Trend>();
    const [streak, setStreak] = createSignal<number>();

    const textCue = createMemo(() => props.textCues[props.idx]);

    function reportConfidence(confidence: Confidence) {
        const textCue = props.textCues[props.currentIdx];
        if (textCue.type !== 'response') return;
        const confidenceInfo = computeConfidenceInfo(textCue, confidence);
        setDiff(confidenceInfo.diff);
        setTrend(confidenceInfo.trend);
        setStreak(confidenceInfo.streak);
        props?.onConfidenceUpdate?.(confidenceInfo);
    }

    return (
        <BaseTextCueView
            textCue={textCue()}
            type={textCue().type}
            afterExtra={
                textCue().type === 'response' && (
                    <ConfidenceReportView
                        diff={diff()}
                        trend={trend()}
                        streak={streak()}
                        onConfidenceReport={reportConfidence}
                    />
                )
            }
            {...rest}
        />
    );
}

function ConfettiCanvas(props: JSX.HTMLAttributes<HTMLCanvasElement>): JSX.Element {
    let confettiCanvas: HTMLCanvasElement | undefined = undefined;

    onMount(() => {
        const creater = confetti.create(confettiCanvas, { resize: true });
        creater();
    });

    return <canvas ref={confettiCanvas} {...props}/>;
}

function TrainingRunCompletedView(props: {
    // FIXME: these props feel like not good capsulation
    divisionInfo: DivisionInfo;
    score: number;
    currentScoreString: string;
    progressBarColor: string;
    scoreboxRef: (ref: HTMLDivElement) => void;
    onNext: () => void;
    onReset: () => void;
}): JSX.Element {
    // FIXME: this is not how we do state
    const scoreHistory = [...props.divisionInfo.scoreHistory, props.score];
    const hasBrokenRecord = props.score > props.divisionInfo.highScore;

    const maxScore = props.divisionInfo.textCues * 4; // FIXME: maxScore is pretty arbitrary
    const highScore = Math.max(maxScore, props.divisionInfo.highScore, props.score);
    // FIXME: getting THIS information won't be trivial
    // const isLastDivision = false; 

    function chartConfigFactory(ctx: CanvasRenderingContext2D): ChartConfiguration {
        const scores = scoreHistory.slice(-7);
        const data = leftPad(scores, 7);
        const hightestRelativeScore = Math.max(maxScore, ...data);

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
                    fill: true,
                },
            ],
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
                            },
                        },
                    },
                },
                clip: 5,
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                        },
                        clip: false,
                    },
                    y: {
                        min: 0,
                        max: hightestRelativeScore,
                        ticks: {
                            stepSize: maxScore / 4,
                        },
                        grid: {
                            color: '#252525',
                        },
                    },
                },
            },
        };
    }

    return (
        <div class="flex flex-col items-center relative">
            <div
                class="invisible font-bold text-[9rem] text-(--score-color)"
                style={{
                    '--score-color': props.progressBarColor,
                }}
                ref={props.scoreboxRef}>
                {props.currentScoreString}
                <span class="text-foreground text-[3rem]">/{highScore}</span>
            </div>
            <SimpleChart onConfig={chartConfigFactory} />
            {hasBrokenRecord && (
                <h3 class="text-heading-3">
                    <i class="bi bi-trophy-fill" style={{ color: progressBarYellow }} /> Neuer High
                    Score!
                </h3>
            )}
            <div class="flex flex-col mb-25 w-full gap-2">
                <Button variant="primary" onClick={() => props.onNext()}>
                    Weiter
                </Button>
                <Button variant="secondary" onClick={() => props.onReset()}>
                    Nochmal
                </Button>
            </div>
            {hasBrokenRecord 
                && <ConfettiCanvas
                    class="absolute top-0 left-0 w-full h-full"/>
            }
        </div>
    );
}

function easeOut(x: number) {
    return Math.sin((x * Math.PI) / 2);
}

function scrollAnimation(element: HTMLElement, top: number, duration: number, onAnimationFinished?: () => void) {
    const from = element.scrollTop;
    const to = top;

    function doAnimation(start: number, current: number) {
        const progress = Math.min(current - start, duration) / duration;
        if (progress >= 1.0) setTimeout(() => onAnimationFinished?.(), 0);
        else requestAnimationFrame(timestamp => doAnimation(start, timestamp));
        element.scrollTop = easeOut(progress) * (to - from) + from;
    }

    requestAnimationFrame(current => {
        requestAnimationFrame(timestamp => doAnimation(current, timestamp));
    });
}

function flyingScoreAnimation(
    score: HTMLHeadingElement,
    scoreBox: HTMLHeadingElement,
    scoreString: Accessor<string>,
    progressBarColor: Accessor<string>,
    onAnimationFinished: () => void,
    owner: Owner,
) {
    function calculateTranslationTo(sourceRect: DOMRect, targetRect: DOMRect): string {
        const relY = targetRect.top + targetRect.height / 2 - sourceRect.height / 2;
        const relX = targetRect.left + targetRect.width / 2 - sourceRect.width / 2;

        return `translate(${relX}px, ${relY}px)`;
    }

    const flyingScore = document.createElement('h2');
    flyingScore.className = 'font-bold top-0 left-0 fixed text-[32px] z-1000';
    const dispsoseFlyingScoreUpdate = createRoot(dispose => {
        createEffect(() => {
            flyingScore.textContent = scoreString();
        });
        return dispose;
    }, owner);
    document.body.append(flyingScore);

    const initalTargetRect = score.getBoundingClientRect();
    const finalTargetRect = scoreBox.getBoundingClientRect();

    const sourceRect = flyingScore.getBoundingClientRect();
    const initialTranslation = calculateTranslationTo(sourceRect, initalTargetRect);
    const finalTranslation = calculateTranslationTo(sourceRect, finalTargetRect);

    flyingScore.style.transform = `${finalTranslation} scale(10)`;
    flyingScore.style.color = progressBarColor();

    const animation = flyingScore.animate(
        [
            { transform: initialTranslation, offset: 0 },
            {
                transform: `${finalTranslation} scale(4.5)`,
                color: progressBarColor(),
                offset: 1,
            },
        ],
        { duration: 500, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' },
    );

    animation.addEventListener('finish', () => {
        scoreBox.classList.remove('invisible');
        flyingScore.remove();
        dispsoseFlyingScoreUpdate();
        onAnimationFinished();
    });
}

function calculateBarColor(score: number, maxScore: number): string {
    const p = score / maxScore;
    if (p > 1) return progressBarGreen;
    else if (p > 0.5) return progressBarYellow;
    else if (p > 0.25) return progressBarOrange;
    return progressBarRed;
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

function calculatePointsForStreak(streak: number): number {
    return 0.5 * (streak ** 2 + streak);
}

function calculateStreakFromPoints(points: number): number {
    const a = 0.5;
    const b = 0.5;
    const c = -points;

    const discriminant = b ** 2 - 4 * a * c;
    if (discriminant < 0) throw 'unreachable';

    const s = Math.sqrt(discriminant);

    const x1 = (-b + s) / (2 * a);
    const x2 = (-b - s) / (2 * a);

    return Math.max(x1, x2);
}

function computeConfidenceInfo(textCue: ResponseTextCue, confidence: Confidence): ConfidenceInfo {
    let newScore = 0;
    switch (confidence) {
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
    let trend: Trend | undefined;
    const previousScore = textCue.previousScores.at(-1);
    if (previousScore === undefined) {
        return { diff: newScore, streak: 0, trend };
    }

    const delta = newScore - previousScore;
    if (previousScore >= 4 && newScore === 4) {
        streak = calculateStreakFromPoints(previousScore - 4) + 1;
        newScore = 4 + calculatePointsForStreak(streak);
        trend = 'uu';
    } else if (delta > 0 && delta <= 2) trend = 'u';
    else if (delta < 0 && delta >= -2) trend = 'd';
    else if (delta >= 3) trend = 'uu';
    else if (delta <= -3) trend = 'dd';

    return { diff, streak, trend };
}

// Remember, `TrainingRunView` (at least theoretically) is resettable. I don't really know how this
// is supposed to be done, its just clear to me that this should normally be considered quite early
// in the architecture (LOL).
function TrainingRunView(props: {
    divisionInfo: DivisionInfo;
    textCues: TextCue[];
    onTrainingRunCompleted: () => void;
    onNext: () => void;
}) {
    // FIXME: this is not how we do state
    const owner = getOwner()!;
    const maxScore = props.divisionInfo.textCues * 4; // FIXME: maxScore is pretty arbitrary
    const scrollContainer = useScrollContainer();
    const observer = new IntersectionObserver(
        entries => setStickyDivisionVisible(!entries[0].isIntersecting),
        { root: scrollContainer },
    );

    let scoreElement: HTMLHeadingElement | undefined = undefined;
    let divisionNameElement: HTMLHeadingElement | undefined = undefined;

    const [stickyDivisionVisible, setStickyDivisionVisible] = createSignal<boolean>(false);
    const [currentIndex, setCurrentIndex] = createSignal<number>(0);
    const [currentScore, setCurrentScore] = createSignal<number>(0);
    const [scoreString, setScoreString] = createSignal<string>(String(currentScore()));
    const [reachedEnd, setReachedEnd] = createSignal<boolean>(false);
    const [currentBarTotal, setCurrentBarTotal] = createSignal<number>(maxScore);
    const [scoreboxRef, setScoreboxRef] = createSignal<HTMLDivElement>();

    const progressBarColor = createMemo<string>(() => calculateBarColor(currentScore(), maxScore));

    onMount(() => {
        divisionNameElement && observer.observe(divisionNameElement);
    });

    onCleanup(() => {
        divisionNameElement && observer.unobserve(divisionNameElement);
    });

    createEffect<number>(prev => {
        const current = currentScore();
        scoreCountAnimation(prev, current);
        return current;
    }, currentScore());

    function scoreCountAnimation(start: number, end: number) {
        const effect: string[] = [];
        for (let c = start; c <= end; c++) {
            effect.push(String(c));
        }

        let currentIndex = 0;
        function advance() {
            if (currentIndex === effect.length - 1) {
                clearInterval(interval);
            }
            setScoreString(effect[currentIndex]);
            currentIndex++;
        }

        let interval = 0;
        advance();
        if (effect.length == 1) return;

        let delta = 75;
        if (effect.length - 1 > 4) delta = 300 /* ms */ / (effect.length - 1);

        interval = setInterval(advance, delta);
    }

    function revealNextCue(onAnimationFinished?: () => void) {
        if (scrollContainer === undefined) return;
        const prev = scrollContainer.scrollTop;
        const nextIdx = currentIndex() + 1;
        if (nextIdx >= props.textCues.length) {
            setReachedEnd(true);
            props.onTrainingRunCompleted();
        } else {
            setCurrentIndex(nextIdx);
        }

        scrollContainer.scrollTop = prev;

        scrollAnimation(scrollContainer, scrollContainer.scrollHeight - scrollContainer.offsetHeight, 250, onAnimationFinished);
    }

    function updateScore(diff: number) {
        setCurrentScore(p => p + diff);

        const currentScore1 = currentScore();
        const currentBarTotal1 = currentBarTotal();
        if (currentScore1 > currentBarTotal1 && currentBarTotal1 < props.divisionInfo.highScore)
            setCurrentBarTotal(props.divisionInfo.highScore);
    }

    function onConfidenceUpdate(info: ConfidenceInfo) {
        // TODO: mutateTextCue(cueIdx, diff);
        updateScore(info.diff + calculatePointsForStreak(info.streak));
        
        if (currentIndex() + 1 < props.textCues.length)
            revealNextCue();
        else
            revealNextCue(() => {
                const scoreboxElement = scoreboxRef();
                if (scoreElement === undefined || scoreboxElement === undefined)
                    return;

                flyingScoreAnimation(
                    scoreElement,
                    scoreboxElement,
                    scoreString,
                    progressBarColor,
                    () => {},
                    owner,
                );
            });

        // TODO: Animations where staggered:
        //  - [
        //      FlyingIndicatorAnimation(info.diff, scoreElement),
        //      info.streak && FlyingIndicatorAnimation(pointsForStreak(info.streak), streakElement)
        //  ]
        //
        //  FlyingIndicatorAnimation(diff, element) timeline:
        //   - flyingIcon = copy(element)
        //   - Animate {
        //        target: flyingIcon,
        //        start { position: positionOf(element) },
        //        end { position: positionOf(scoreElement) },
        //        duration: 500,
        //        easing: 'cubic-bezier(0.7, 0, 0.84, 0)'
        //     }
        //   - score = currentScore()
        //   - setCurrentScore(score + diff);
        //   - InParallel {
        //        + CountingScoreAnimation {
        //             from: score,
        //             to: score + info.diff,
        //             duration: 300
        //          }
        //        + BubbleAnimation
        //     }
        //
        //  BubbleAnimation timeline:
        //   - bubble = <span/>
        //   - setColor(bubble, progressBarColor())
        //   - setPosition(bubble, positionOf(scoreElement), 'center')
        //   - Animate {
        //        target: bubble,
        //        start: { size: [0, 0], opacity: 0.2 },
        //        end: { size: [window.width, window.height], opacity: 0 },
        //        duration: 250,
        //        easing: 'ease-out'
        //     }
        //
        // TODO:
        //  - translate FlyingScoreAnimation into timeline
        //  - build timeline animation tool
    }

    function onReset() {}

    return (
        <div class="flex-1 select-none">
            <span class="hidden fixed top-15 left-0 right-0 text-center py-1 bg-accent1 border-b border-lighter1 z-1000"
                classList={{ 'block': stickyDivisionVisible() }}>
                {props.divisionInfo.name}
            </span>
            <div
                class="min-h-[calc(100svh-var(--spacing)*(var(--sct-scroll-padding)+var(--sct-button-height)+20))] pb-6 flex flex-col">
                <h2 class="text-center text-heading-2 py-2"
                    ref={divisionNameElement}>
                    {props.divisionInfo.name}
                </h2>
                <DivisionInfoView info={props.divisionInfo} />
                <div class="mbs-auto">
                    <TextCueView
                        idx={0}
                        currentIdx={currentIndex()}
                        textCues={props.textCues}
                        onConfidenceUpdate={undefined}
                    />
                </div>
            </div>
            <div class="flex flex-col gap-6">
                <For each={Array.from({ length: currentIndex() }, (_, index) => index + 1)}>
                    {idx => (
                        <TextCueView
                            idx={idx}
                            currentIdx={currentIndex()}
                            textCues={props.textCues}
                            onConfidenceUpdate={onConfidenceUpdate}
                        />
                    )}
                </For>
            </div>
            {currentIndex() % 2 === 0 ? (
                <div
                    class="flex"
                    classList={{
                        'pt-6': currentIndex() > 0,
                    }}>
                    <Button variant="primary" 
                        class="ms-auto"
                        onClick={() => revealNextCue()}>
                        Aufdecken
                    </Button>
                </div>
            ) : null}
            {!reachedEnd() ? (
                <div class="h-[calc(var(--spacing)*var(--sct-scroll-padding))]" />
            ) : (
                <TrainingRunCompletedView
                    divisionInfo={props.divisionInfo}
                    score={currentScore()}
                    currentScoreString={scoreString()}
                    progressBarColor={progressBarColor()}
                    scoreboxRef={setScoreboxRef}
                    onNext={props.onNext}
                    onReset={onReset}
                />
            )}
            <div class="absolute left-0 bottom-0 right-0 flex flex-col bg-accent1 p-2 pb-4 gap-2 z-50">
                <div class="flex">
                    <h1 ref={scoreElement} class="text-heading-1 font-bold">
                        {scoreString()}
                    </h1>
                    <span class="ms-auto font-semibold">
                        {Math.floor(currentIndex() / 2) + 1} / {props.divisionInfo.textCues}
                    </span>
                </div>
                <div
                    class="h-4 bg-lighter1 rounded-full"
                    style={{
                        '--progress-width': Math.min(currentScore() / currentBarTotal(), 1),
                        '--progress-color': progressBarColor(),
                    }}>
                    <div class="h-4 rounded-full bg-[var(--progress-color)] w-[calc(100%*var(--progress-width))] transition-(--pgb-transition-properties) duration-250 ease-(--pgb-transition-motion-bezier)" />
                </div>
            </div>
        </div>
    );
}

export function TrainingRunWrapper(props: {
    scriptID: schemas.UUID;
    divisionIdx: number;
}): JSX.Element {
    const scriptQuery = useQuery<Script>(() => ({ queryKey: ['script', props.scriptID] }));

    type CapturedDivision = {
        info: DivisionInfo;
        textCues: TextCue[];
    };

    const [capturedDivision, setCapturedDivision] = createSignal<CapturedDivision>();

    createEffect(() => {
        if (capturedDivision() !== undefined) return; // FIXME: update the training view here
        if (scriptQuery.status === 'success') {
            const script = scriptQuery.data;
            const division = script.divisions[props.divisionIdx];
            document.title = `${script.name} - Quipt`;
            const textCues = division.textCues.flatMap(pair => [
                { ...pair.request, type: 'request' } as RequestTextCue,
                {
                    ...pair.response,
                    previousScores: [...pair.previousScores],
                    type: 'response',
                } as ResponseTextCue,
            ]);

            setCapturedDivision({
                info: computeDivisionInfo(division),
                textCues,
            });
        }
    });

    return (
        <>
            {capturedDivision() && (
                <TrainingRunView
                    divisionInfo={capturedDivision()!.info}
                    textCues={capturedDivision()!.textCues}
                    onTrainingRunCompleted={() => {}}
                    onNext={() => {}}
                />
            )}
        </>
    );
}
