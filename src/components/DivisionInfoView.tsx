import { JSX, createMemo } from "solid-js";
import { Division } from '../backend';
import { computeDivisionInfo, formatMarkdown, formatString, pluralize } from './common';

export function DivisionInfoView(
    props: {
        division: Readonly<Division>
    }
): JSX.Element {
    const info = createMemo(() => computeDivisionInfo(props.division))

    return (
        <div class="division-info-wrapper">
            <div class="division-info">
                <span class="info">
                    { info().actors.join(', ') } · { pluralize(info().textCues, 'Einsatz', 'Einsätze') }
                </span>
                <span class="content">
                    { formatString(formatMarkdown(props.division.description)) }
                </span>
            </div>
        </div>
    );
}
