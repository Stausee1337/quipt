import { onMount, JSX, mapArray, Accessor, createMemo } from 'solid-js';
import { A } from '@solidjs/router';
import { ChartConfiguration, ChartData } from 'chart.js/auto';
import { Division, Script } from '../schemas';
import { progressBarGreen, progressBarYellow, progressBarRed, computeDivisionInfo, pluralize, computeScriptInfo, SimpleChart, leftPad } from './common';
import { createEffect } from 'solid-js';

export function ScriptOverview(
    props: {
        script: Script
    }
): JSX.Element {
    const scriptInfo = createMemo(() => computeScriptInfo(props.script));

    function renderDivision(division: Division, idx: Accessor<number>) {
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
                    <span class="info">{ pluralize(textCues, 'Einsatz', 'Einsätze') }</span>
                </div>
                <SimpleChart onConfig={chartConfigFactory}/>
                <div class="score-info">
                    <span class="row" style={{ color: progressBarYellow }}>
                        <i class="bi bi-trophy-fill"/> { highScore }
                    </span>
                    <span class="row" style={{ color: trendColor }}>
                        <i class={`bi bi-${trendIcon}`}/> { deltaString }
                    </span>
                    {
                        division.previousTotals.length === 0 ? null : (
                            <span class="row">
                                <i class="bi bi-arrow-repeat"/> { division.previousTotals.length } x
                            </span>
                        )
                    }
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
                <span class="info">{ pluralize(scriptInfo().textCues, 'Einsatz', 'Einsätze') }</span>
                <span class="info">{ scriptInfo().actors.join(', ') }</span>
            </div>
            {
                mapArray(() => props.script.divisions, renderDivision) as any
            }
        </div> 
    );
}

