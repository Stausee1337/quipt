import { useId, useRef, type ComponentProps, type JSX } from 'react';

import { Menu, Toggle, ToggleGroup } from '@base-ui/react';

import { Input } from 'quipt/components/input';
import {
    ActorPill as BaseActorPill,
    type ActorPillProps as BaseActorPillProps,
} from 'quipt/components/actor-pill';
import { type Color, colorToString, asLighterColor } from 'quipt/color-palette';
import { MenuBox, MenuSeparator, popupClass, MenuCheckboxItem } from './menu';
import {
    useKeyedState,
    useScriptEditorManager,
    useScriptEditorStateAccessor,
} from '../model/hooks';
import { type ActorKey } from '../model/state';
import * as actions from '../model/actions';

export interface ActorPillProps extends Omit<BaseActorPillProps, 'actor'> {
    actorKey: ActorKey;
}

export function ActorPill({ actorKey, ...props }: ActorPillProps) {
    const actor = useKeyedState(actorKey);
    return <BaseActorPill actor={actor} {...props} />;
}

interface ColorPickerProps {
    color: Color;
    onColorPicked?: (color: Color) => void;
}

const rows = 4;
const cols = 6;

function asRowMajor(i: number): number {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return col * rows + row;
}

function ColorPicker({ color, onColorPicked }: ColorPickerProps): JSX.Element {
    return (
        <ToggleGroup
            value={[`${color}`]}
            onValueChange={onColorPicked && (value => onColorPicked(parseInt(value[0]) as Color))}
            className="grid grid-cols-[repeat(6,auto)] grid-rows-4 justify-between gap-y-4 p-2">
            {Array.from({ length: 24 })
                .map((_, idx) => (asRowMajor(idx) + 1) as Color)
                .map(color => (
                    <Toggle
                        className="outline-primary h-4 w-4 cursor-pointer rounded-full bg-(--default-color) outline-offset-2 hover:bg-(--hover-color) data-pressed:outline"
                        key={color}
                        value={`${color}`}
                        style={{
                            '--default-color': `var(--color-${colorToString(color)})`,
                            '--hover-color': `var(--color-${asLighterColor(color)})`,
                        }}
                    />
                ))}
        </ToggleGroup>
    );
}

function ActorEditMenu(props: { actor: ActorKey }): JSX.Element {
    const inputId = useId();
    const manager = useScriptEditorManager();
    const actor = useKeyedState(props.actor);
    const isSelfActor = useScriptEditorStateAccessor(state => state.selfActor === props.actor);

    return (
        <MenuBox>
            <Input
                className="mx-2"
                placeholder="Spieler benennen"
                id={inputId}
                value={actor.name}
                onValueChange={(value, event) =>
                    manager.dispatch(actions.renameActor, {
                        actorKey: props.actor,
                        name: value,
                        inputId,
                        event: event.event,
                    })
                }
                onKeyDown={e => !(e.ctrlKey && e.key === 'z') && e.stopPropagation()}
                onKeyUp={e => e.stopPropagation()}
                autoFocus
            />
            <MenuSeparator />
            <ColorPicker
                color={actor.color}
                onColorPicked={color =>
                    manager.dispatch(actions.changeActorColor, {
                        actorKey: props.actor,
                        newColor: color,
                    })
                }
            />
            <MenuSeparator />
            <MenuCheckboxItem
                checked={isSelfActor}
                onCheckedChange={() =>
                    manager.dispatch(actions.toggleActorMarkedAsSelf, props.actor)
                }>
                Als "ich selbst" markieren
            </MenuCheckboxItem>
            {/*
                <MenuSeparator />
                <MenuItem iconName="vr">Aufspalten</MenuItem>
            */}
        </MenuBox>
    );
}

export function ActorsContainer({
    actors,
    className,
    children,
    ...props
}: { actors: readonly ActorKey[] } & ComponentProps<'div'>): JSX.Element {
    const actorMenuHandleRef = useRef<Menu.Handle<{ actor: ActorKey }>>(undefined);
    if (actorMenuHandleRef.current === undefined)
        actorMenuHandleRef.current = Menu.createHandle<{ actor: ActorKey }>();

    const selfActor = useScriptEditorStateAccessor(state => state.selfActor);

    return (
        <div className={className} {...props}>
            {
                selfActor && actors.includes(selfActor) && (
                    <Menu.Trigger
                        key={selfActor}
                        id={selfActor}
                        handle={actorMenuHandleRef.current}
                        payload={{ actor: selfActor }}
                        render={<ActorPill actorKey={selfActor} selected interactable />}
                    />
                )
            }
            {
                actors
                    .filter(actor => actor !== selfActor)
                    .map(actor => 
                        <Menu.Trigger
                            key={actor}
                            id={actor}
                            handle={actorMenuHandleRef.current}
                            payload={{ actor }}
                            render={<ActorPill actorKey={actor} interactable />}
                        />
                    )
            }
            <Menu.Root handle={actorMenuHandleRef.current}>
                {({ payload }) => (
                    <Menu.Portal>
                        <Menu.Positioner sideOffset={8} align="start" className="outline-hidden">
                            <Menu.Popup className={popupClass}>
                                {payload?.actor && <ActorEditMenu actor={payload.actor} />}
                            </Menu.Popup>
                        </Menu.Positioner>
                    </Menu.Portal>
                )}
            </Menu.Root>
            {children}
        </div>
    );
}
