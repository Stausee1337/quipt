import React, { type JSX, type ReactElement } from 'react';

import { Tooltip as TooltipBase, type TooltipPositionerProps } from '@base-ui/react/tooltip';

import { withProps } from 'quipt/utils';

export interface TooltipProps {
    children: ReactElement;
    label: string;
    side?: TooltipPositionerProps['side'];
}

export function Tooltip({
    children,
    label,
    side
}: TooltipProps): JSX.Element {
    const transformedChildren = React.isValidElement(children) && typeof children.props === 'object'
        ? { ...children, props: { ...children.props, 'aria-label': label } }
        : children;

    return (
        <TooltipBase.Root>
            { transformedChildren }
            <TooltipBase.Portal>
                <TooltipBase.Positioner sideOffset={8} side={side}>
                    <TooltipBase.Popup className="relative flex flex-col gap-1 origin-[var(--transform-origin)] bg-black p-2 rounded-lg text-foreground outline-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0">
                        <TooltipBase.Arrow className="relative block w-3 h-1.5 overflow-clip data-[side=bottom]:top-[-6px] data-[side=left]:right-[-9px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-6px] data-[side=top]:rotate-180 before:content-[''] before:absolute before:bottom-0 before:left-1/2 before:w-[calc(6px*sqrt(2))] before:h-[calc(6px*sqrt(2))] before:bg-black before:[transform:translate(-50%,50%)_rotate(45deg)]" />
                        <span className="text-sm font-bold">{ label }</span>
                    </TooltipBase.Popup>
                </TooltipBase.Positioner>
            </TooltipBase.Portal>
        </TooltipBase.Root>
    );
}

Tooltip.Trigger = withProps(TooltipBase.Trigger, { delay: 0 });
