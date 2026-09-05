import { JSX, ComponentProps, ReactNode } from 'quipt/rexport';

import classnames from 'classnames';

import {
    DivisionInfo,
    FormattedStringView,
    computeDivisionInfo,
    formatMarkdown,
    pluralize,
} from 'quipt/components/common';
import { Division } from 'quipt/schemas';
import { InfoText } from 'quipt/components/basics';

export interface DivisionInfoViewProps extends ComponentProps<'div'> {
    info: DivisionInfo;
    external?: ReactNode;
    children?: ReactNode;
}

export function DivisionInfoView({ children, style, info, external, className, ...rest }: DivisionInfoViewProps): JSX.Element {
    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className={classnames(
                    'bg-accent1 flex max-w-17/20 flex-col gap-1 overflow-hidden rounded-lg p-2', 
                    className
                )}
                {...rest}>
                <InfoText className="text-center">
                    {info.actors.join(', ')} ·{' '}
                    {pluralize(info.textCues, 'Einsatz', 'Einsätze')}
                </InfoText>
                {external ?? (
                    <span className="text-justify whitespace-pre-wrap">
                        <FormattedStringView string={formatMarkdown(info.description)} />
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

export interface CreateDivisionInfoViewProps extends ComponentProps<'div'> {
    division: Division;
    external?: ReactNode;
    children?: ReactNode;
}

export function CreateDivisionInfoView({ division, ...rest}: CreateDivisionInfoViewProps): JSX.Element {
    return <DivisionInfoView info={computeDivisionInfo(division)} {...rest} />;
}
