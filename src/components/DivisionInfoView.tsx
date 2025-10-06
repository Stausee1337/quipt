/* @refresh reload */
import { JSX, createMemo, createSignal, untrack } from "solid-js";
import { Division } from '../backend';
import { computeDivisionInfo, formatMarkdown, formatString, pluralize } from './common';
import { ExposedComponent, bindComponent } from "../exposed-component";

export interface DivisionInfoComponent {
    readonly infoElement: HTMLDivElement;
    injectContent(content: JSX.Element): (() => void)|undefined;
}

export function DivisionInfoView(
    props: {
        division: Readonly<Division>,
        children?: JSX.Element
    }
): ExposedComponent<DivisionInfoComponent> {
    const [externalContent, setExternalContent] = createSignal<JSX.Element>();
    const info = createMemo(() => computeDivisionInfo(props.division))

    let infoElement: HTMLDivElement;
    return bindComponent<DivisionInfoComponent>({
        get infoElement() {
            return infoElement;
        },
        injectContent(content) {
            if (untrack(externalContent) !== undefined)
                return;
            setExternalContent(content); 
            return () => setExternalContent(undefined);
        },
        template: (
            <div class="division-info-wrapper">
                <div ref={infoElement} class="division-info">
                    <span class="info">
                        { info().actors.join(', ') } · { pluralize(info().textCues, 'Einsatz', 'Einsätze') }
                    </span>
                    {
                        externalContent() ?? (
                            <span class="content">
                                { formatString(formatMarkdown(props.division.description)) }
                            </span>
                        )
                    }
                </div>
                { props.children }
            </div>
        )
    });
}
