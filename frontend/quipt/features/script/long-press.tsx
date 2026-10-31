import { useCallback, useEffect, useRef } from 'react';

type UseLongPressOptions = {
    threshold?: number;
    movementThreshold?: number;
};

type UseLongPressHandlers = Pick<
    React.DOMAttributes<HTMLElement>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onContextMenu'
>;

export function useLongPress(
    onLongPress: () => void,
    { threshold = 500, movementThreshold = 10 }: UseLongPressOptions = {},
): UseLongPressHandlers {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pointerId = useRef<number | null>(null);
    const startPosition = useRef<{ x: number; y: number } | null>(null);
    const callback = useRef(onLongPress);

    callback.current = onLongPress;

    const cancel = useCallback(() => {
        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }

        pointerId.current = null;
        startPosition.current = null;
    }, []);

    useEffect(() => cancel, [cancel]);

    const onPointerDown = useCallback<NonNullable<UseLongPressHandlers['onPointerDown']>>(
        event => {
            if (event.pointerType !== 'touch') return;

            // A second simultaneous touch cancels the gesture.
            if (pointerId.current !== null) {
                cancel();
                return;
            }

            pointerId.current = event.pointerId;
            startPosition.current = {
                x: event.clientX,
                y: event.clientY,
            };

            timer.current = setTimeout(() => {
                timer.current = null;
                callback.current();
            }, threshold);
        },
        [threshold, cancel],
    );

    const onPointerMove = useCallback<NonNullable<UseLongPressHandlers['onPointerMove']>>(
        event => {
            if (event.pointerId !== pointerId.current || !startPosition.current) {
                return;
            }

            const dx = event.clientX - startPosition.current.x;
            const dy = event.clientY - startPosition.current.y;

            if (Math.hypot(dx, dy) > movementThreshold) {
                cancel();
            }
        },
        [movementThreshold, cancel],
    );

    const onPointerUp = useCallback<NonNullable<UseLongPressHandlers['onPointerUp']>>(
        event => {
            if (event.pointerId === pointerId.current) {
                cancel();
            }
        },
        [cancel],
    );

    const onPointerCancel = onPointerUp;

    const onContextMenu = useCallback<NonNullable<UseLongPressHandlers['onContextMenu']>>(event => {
        // Suppress the native touch context menu.
        if (pointerId.current !== null) {
            event.preventDefault();
        }
    }, []);

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        onContextMenu,
    };
}
