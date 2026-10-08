import React, { type JSX, type ReactElement } from 'react';

import { Tooltip as TooltipBase, type TooltipPositionerProps } from '@base-ui/react/tooltip';

export interface TooltipProps {
    children: ReactElement;
    label: string;
    side?: TooltipPositionerProps['side'];
    instant?: boolean;
}

export function Tooltip({ children, label, instant, side }: TooltipProps): JSX.Element {
    const transformedChildren =
        React.isValidElement(children) && typeof children.props === 'object'
            ? { ...children, props: { ...children.props, 'aria-label': label } }
            : children;

    return (
        <TooltipBase.Root>
            {transformedChildren}
            <TooltipBase.Portal>
                <TooltipBase.Positioner sideOffset={8} side={side}>
                    <TooltipBase.Popup
                        className="text-foreground relative flex origin-[var(--transform-origin)] flex-col gap-1 rounded-lg bg-black p-2 transition-[scale,opacity] duration-100 ease-out outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:not-data-instant:scale-[0.98] data-starting-style:not-data-instant:opacity-0"
                        data-instant={instant ? '' : undefined}>
                        <TooltipBase.Arrow className="relative block h-1.5 w-3 overflow-clip before:absolute before:bottom-0 before:left-1/2 before:h-[calc(6px*sqrt(2))] before:w-[calc(6px*sqrt(2))] before:[transform:translate(-50%,50%)_rotate(45deg)] before:bg-black before:content-[''] data-[side=bottom]:top-[-6px] data-[side=left]:right-[-9px] data-[side=left]:rotate-90 data-[side=right]:left-[-9px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-6px] data-[side=top]:rotate-180" />
                        <span className="text-sm font-bold">{label}</span>
                    </TooltipBase.Popup>
                </TooltipBase.Positioner>
            </TooltipBase.Portal>
        </TooltipBase.Root>
    );
}

Tooltip.Trigger = TooltipBase.Trigger;
