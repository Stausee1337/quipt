import { type ComponentProps, type JSX } from 'react';

import { Menu } from '@base-ui/react';
import classnames from 'classnames';

import { Icon } from 'quipt/components/icon';

export const popupClass =
    'relative origin-[var(--transform-origin)] transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 text-foreground';
const itemClass =
    'flex cursor-pointer p-2 outline-hidden select-none z-0 relative before:absolute before:-z-1 before:rounded-2xl before:top-0 before:left-0 before:right-0 before:bottom-0 data-highlighted:before:bg-accent-100/20 gap-x-2 items-center data-disabled:opacity-50 data-disabled:cursor-not-allowed';

export interface MenuItemProps extends Menu.Item.Props {
    iconName?: string;
}

export function MenuItem({ className, children, iconName, ...props }: MenuItemProps): JSX.Element {
    return (
        <Menu.Item className={classnames(itemClass, className)} {...props}>
            <span className="size-5">
                {iconName && <Icon iconName={iconName} className="size-5" />}
            </span>
            <span>{children}</span>
        </Menu.Item>
    );
}

export function MenuCheckboxItem({ className, children, ...props }: Menu.CheckboxItem.Props) {
    return (
        <Menu.CheckboxItem
            className={classnames(itemClass, 'data-checked:not-data-disabled:text-primary', className)}
            {...props}>
            <span className="size-5">
                <Menu.CheckboxItemIndicator
                    render={<Icon iconName="check2" className="size-5" />}
                />
            </span>
            <span>{children}</span>
        </Menu.CheckboxItem>
    );
}

export function MenuSeparator(): JSX.Element {
    return <Menu.Separator className="border-accent-50 mx-2 border-b" />;
}

export function MenuBox({ className, ...props }: ComponentProps<'div'>): JSX.Element {
    return (
        <div
            className={classnames(
                'bg-accent-20 flex w-65 flex-col gap-2 rounded-3xl p-2 shadow-xl/50 outline-hidden',
                className,
            )}
            {...props}
        />
    );
}
