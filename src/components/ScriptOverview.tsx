import { For, JSX, createEffect, createMemo, splitProps } from 'solid-js';

import { A } from '@solidjs/router';
import { useQuery } from '@tanstack/solid-query';
import { ChartConfiguration, ChartData } from 'chart.js/auto';
import { schemas } from 'qrpc-js';

import {
    SimpleChart,
    computeDivisionInfo,
    computeScriptInfo,
    leftPad,
    pluralize,
} from 'quipt/components/common';
import { Script } from 'quipt/schemas';
import { InfoText } from './basics';

function IconScore(props: JSX.HTMLAttributes<HTMLSpanElement> & {
    icon: string
}): JSX.Element {
    const [, rest] = splitProps(props, ['icon', 'class', 'children']);

    return (
        <span 
            class={`text-sm font-semibold text-center ${props.class ?? ''}`}
            {...rest}>
            <i class={`bi bi-${props.icon} mr-1`} />
            {props.children}
        </span>
    )
}

function DivisionItem(props: { script: Script; idx: number }): JSX.Element {
    const division = createMemo(() => props.script.divisions[props.idx]);
    const divisionInfo = createMemo(() => computeDivisionInfo(division()));
    const highScore = createMemo(() => Math.max(0, ...division().previousTotals));
    const maxScore = createMemo(() => Math.max(division().textCues.length * 4, highScore()));

    const displayInfo = createMemo(() => {
        const previousTotals = division().previousTotals;
        const p1 = previousTotals.at(-1) ?? 0;
        const p2 = previousTotals.at(-2) ?? 0;

        let trendIcon: string;
        let trendColor: string | undefined;
        const delta = p1 - p2;
        const deltaString = `${Math.abs(delta)} pts`;
        if (delta < 0) {
            trendColor = 'text-pgb-red';
            trendIcon = 'chevron-double-down';
        } else if (delta > 0) {
            trendColor = 'text-pgb-green';
            trendIcon = 'chevron-double-up';
        } else trendIcon = 'plus-slash-minus';

        return { trendIcon, trendColor, deltaString };
    });

    function chartConfigFactory(ctx: CanvasRenderingContext2D): ChartConfiguration {
        const data = leftPad(division().previousTotals, 3);
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
                    borderWidth: 1,
                },
            ],
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
                        enabled: false,
                    },
                },
                interaction: undefined,
                hover: { mode: undefined },
                scales: {
                    x: {
                        display: false,
                    },
                    y: {
                        display: false,
                        max: maxScore(),
                    },
                },
            },
        };
    }

    return (
        <A class="p-2 flex relative after:absolute after:bottom-0 after:left-1/2 after:w-[calc(100%-var(--spacing)*8)] after:-translate-x-1/2 after:border-b after:border-lighter1 last:after:content-none" 
            href={`/script/${props.script.uuid}/${props.idx + 1}`}>
            <div class="flex flex-col flex-1 justify-between gap-1 min-w-0 max-w-full">
                <h3>{division().name}</h3>
                <InfoText>{divisionInfo().actors.length} Spieler</InfoText>
                <InfoText>
                    {pluralize(divisionInfo().textCues, 'Einsatz', 'Einsätze')}
                </InfoText>
            </div>
            <SimpleChart class="w-25 my-auto" onConfig={chartConfigFactory} />
            <div class="flex flex-col justify-evenly w-18 ml-1">
                <IconScore icon="trophy-fill" class="text-pgb-yellow">
                    {highScore()}
                </IconScore>
                <IconScore icon={displayInfo().trendIcon} class={displayInfo().trendColor}>
                    {displayInfo().deltaString}
                </IconScore>
                {division().previousTotals.length === 0 ? null : (
                    <IconScore icon="arrow-repeat">
                        {division().previousTotals.length} x
                    </IconScore>
                )}
            </div>
        </A>
    );
}

export function ScriptOverview(props: { scriptID: schemas.UUID }): JSX.Element {
    const scriptQuery = useQuery<Script>(() => ({ queryKey: ['script', props.scriptID] }));
    const script = createMemo(() => scriptQuery.data!);
    const scriptInfo = createMemo(() => computeScriptInfo(script()));

    createEffect(() => {
        document.title = `${script().name} - Quipt`;
    });

    return (
        <div class="w-full flex-1 flex flex-col">
            <div class="p-2 flex flex-col gap-1">
                <h2 class="text-heading-2">{script().name}</h2>
                <InfoText>{pluralize(scriptInfo().textCues, 'Einsatz', 'Einsätze')}</InfoText>
                <InfoText>{scriptInfo().actors.join(', ')}</InfoText>
            </div>
            <For each={script().divisions}>
                {(_, idx) => <DivisionItem script={script()} idx={idx()} />}
            </For>
        </div>
    );
}
