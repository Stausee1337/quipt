import { type ComponentProps, type JSX, type ReactNode } from 'react';

import { Dialog } from '@base-ui/react';
import classnames from 'classnames';

import { Icon } from 'quipt/components/icon';

const ModalBox = ({ className, ...props }: ComponentProps<'div'>) => (
    <div
        className={classnames(
            'bg-accent-20 text-foreground flex flex-col gap-2 rounded-3xl p-4 shadow-xl/50 select-none',
            className,
        )}
        {...props}
    />
);

const ModalPopup = ({ className, ...props }: Dialog.Popup.Props) => (
    <Dialog.Popup
        className={classnames(
            'fixed top-1/2 left-1/2 -mt-8 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0',
            className,
        )}
        {...props}
    />
);

const ModalTitle = ({ className, ...props }: Dialog.Title.Props) => (
    <Dialog.Title className={classnames('text-heading-2', className)} {...props} />
);

const ModalClose = ({ className, ...props }: Omit<Dialog.Close.Props, 'children'>) => (
    <Dialog.Close className="cursor-pointer" aria-label="schließen" {...props}>
        <Icon iconName="x" className="h-7.5 w-7.5" aria-hidden="true" />
    </Dialog.Close>
);

export interface ModalProps extends ComponentProps<'div'> {
    heading: ReactNode;
}

export function Modal({ className, children, heading, ...props }: ModalProps): JSX.Element {
    return (
        <ModalBox className={classnames('w-120', className)} {...props}>
            <div className="flex items-center justify-between">
                <ModalTitle className="text-heading-2">{heading}</ModalTitle>
                <ModalClose />
            </div>
            {children}
        </ModalBox>
    );
}

Modal.Backdrop = ({ className, ...props }: Dialog.Backdrop.Props) => (
    <Dialog.Backdrop
        className={classnames(
            'transition-background fixed inset-0 min-h-dvh bg-black/50 backdrop-blur-[1px] duration-150 data-ending-style:bg-black/0 data-starting-style:bg-black/0 supports-[-webkit-touch-callout:none]:absolute',
            className,
        )}
        {...props}
    />
);

Modal.Popup = ModalPopup;
Modal.Box = ModalBox;
Modal.Title = ModalTitle;
Modal.Close = ModalClose;
Modal.Root = Dialog.Root;
Modal.Portal = Dialog.Portal;
Modal.Description = Dialog.Description;
