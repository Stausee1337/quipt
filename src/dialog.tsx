import { Component, JSX, Owner, createRoot } from 'solid-js';
import { insert } from 'solid-js/web';

export class DialogManager {
    public static async openSideMenu(
        content: Component<{ closer: () => void }>,
        detachedOwner?: typeof Owner,
    ): Promise<void> {
        const rootElement = (<div id="dialog-root" />) as HTMLDivElement;
        document.body.appendChild(rootElement);

        await createRoot(async dispose => {
            await new Promise<void>(resolve => {
                const dialogBox = <SideMenu onClose={resolve}>{content}</SideMenu>;
                insert(rootElement, () => dialogBox, null);
            });
            dispose();
        }, detachedOwner);

        rootElement.remove();
    }
}

function SideMenu({
    children: Children,
    onClose,
}: {
    children: Component<{ closer: () => void }>;
    onClose: () => void;
}): JSX.Element {
    function deferClose() {
        dialog.classList.add('removing');
        dialog.addEventListener(
            'animationend',
            () => {
                onClose();
            },
            { once: true },
        );
    }

    const dialog = (
        <div id="floating-menu">
            <Children closer={deferClose} />
        </div>
    ) as HTMLDivElement;

    return (
        <>
            <div id="floating-menu-backdrop" onClick={deferClose} />
            {dialog}
        </>
    );
}
