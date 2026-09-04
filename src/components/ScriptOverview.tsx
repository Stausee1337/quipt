import { HTMLAttributes, JSX, useEffect, useMemo } from 'quipt/rexport';

import { Link } from 'react-router';
import classnames from 'classnames';
import { useQuery } from '@tanstack/react-query';
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
import { InfoText } from 'quipt/components/basics';

function IconScore(
    { icon, className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & {
        icon: string;
    },
): JSX.Element {
    return (
        <span className={classnames(
            'text-center text-sm font-semibold',
            className
        )} {...rest}>
            <i className={`bi bi-${icon} mr-1`} />
            {children}
        </span>
    );
}

function DivisionItem({ script, idx }: { script: Script; idx: number }): JSX.Element {
    const division = script.divisions[idx];
    const divisionInfo = useMemo(() => computeDivisionInfo(division), [division]);
    const highScore = useMemo(() => Math.max(0, ...division.previousTotals), [division]);
    const maxScore = useMemo(() => Math.max(division.textCues.length * 4, highScore), [division, highScore]);

    const displayInfo = useMemo(() => {
        const previousTotals = division.previousTotals;
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
    }, [division]);

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
                        max: maxScore,
                    },
                },
            },
        };
    }

    return (
        <Link
            className="after:border-lighter1 relative flex p-2 after:absolute after:bottom-0 after:left-1/2 after:w-[calc(100%-var(--spacing)*8)] after:-translate-x-1/2 after:border-b last:after:content-none"
            to={`/script/${script.uuid}/${idx + 1}`}>
            <div className="flex max-w-full min-w-0 flex-1 flex-col justify-between gap-1">
                <h3 className="overflow-hidden text-ellipsis whitespace-nowrap">{division.name}</h3>
                <InfoText>{divisionInfo.actors.length} Spieler</InfoText>
                <InfoText>{pluralize(divisionInfo.textCues, 'Einsatz', 'Einsätze')}</InfoText>
            </div>
            <SimpleChart className="my-auto w-25" onConfig={chartConfigFactory} />
            <div className="ml-1 flex w-18 flex-col justify-evenly">
                <IconScore icon="trophy-fill" className="text-pgb-yellow">
                    {highScore}
                </IconScore>
                <IconScore icon={displayInfo.trendIcon} className={displayInfo.trendColor}>
                    {displayInfo.deltaString}
                </IconScore>
                {division.previousTotals.length === 0 ? null : (
                    <IconScore icon="arrow-repeat">{division.previousTotals.length} x</IconScore>
                )}
            </div>
        </Link>
    );
}

export function ScriptOverview({ scriptID }: { scriptID: schemas.UUID }): JSX.Element {
    const scriptQuery = useQuery<Script>({ queryKey: ['script', scriptID] });
    const script = scriptQuery.data!;
    const scriptInfo = useMemo(() => computeScriptInfo(script), [script]);

    useEffect(() => {
        document.title = `${script.name} - Quipt`;
    }, [script]);

    return (
        <div className="flex w-full flex-1 flex-col">
            <div className="flex flex-col gap-1 p-2">
                <h2 className="text-heading-2">{script.name}</h2>
                <InfoText>{pluralize(scriptInfo.textCues, 'Einsatz', 'Einsätze')}</InfoText>
                <InfoText className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {scriptInfo.actors.join(', ')}
                </InfoText>
            </div>
            {script.divisions.map((_, idx) => <DivisionItem script={script} idx={idx} key={script.divisions[idx].name} />)}
        </div>
    );
}
