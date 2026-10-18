import { useRef, type JSX } from 'react';

import { Menu, Toggle, ToggleGroup } from '@base-ui/react';

import { Input } from 'quipt/components/input';
import { ActorPill, type ActorPillProps } from 'quipt/components/actor-pill';
import { type Color, colorToString, asLighterColor } from 'quipt/color-palette';
import { MenuItem, MenuBox, MenuSeparator, popupClass } from './menu';
import { actions, useKeyedState, useScriptEditorManager } from './script';
import { type ActorKey } from '../state';

export interface ActorKeyPillProps extends Omit<ActorPillProps, 'actor'> {
    actorKey: ActorKey;
}

export function ActorKeyPill({ actorKey, ...props }: ActorKeyPillProps) {
    const actor = useKeyedState(actorKey);
    return <ActorPill actor={actor} {...props} />;
}

export interface ColorPickerProps {
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
    const manager = useScriptEditorManager();
    const actor = useKeyedState(props.actor);

    return (
        <MenuBox>
            <Input
                className="mx-2"
                placeholder="Spieler benennen"
                value={actor.name}
                onValueChange={value => manager.dispatch(actions.renameActor(props.actor, value))}
                onKeyDown={e => e.stopPropagation()}
                onKeyUp={e => e.stopPropagation()}
                autoFocus
            />
            <MenuSeparator />
            <ColorPicker
                color={actor.color}
                onColorPicked={color =>
                    manager.dispatch(actions.changeActorColor(props.actor, color))
                }
            />
            <MenuSeparator />
            <MenuItem>Als "ich selbst" markieren</MenuItem>
            <MenuSeparator />
            <MenuItem iconName="vr">Aufspalten</MenuItem>
        </MenuBox>
    );
}

export function ActorsContainer({ actors }: { actors: readonly ActorKey[] }): JSX.Element {
    const actorMenuHandleRef = useRef<Menu.Handle<{ actor: ActorKey }>>(undefined);
    if (actorMenuHandleRef.current === undefined)
        actorMenuHandleRef.current = Menu.createHandle<{ actor: ActorKey }>();

    return (
        <div className="flex flex-wrap gap-2">
            {actors.map((actor, idx) => (
                <Menu.Trigger
                    key={actor}
                    handle={actorMenuHandleRef.current}
                    payload={{ actor }}
                    render={<ActorKeyPill actorKey={actor} selected={!idx} interactable />}
                />
            ))}
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
        </div>
    );
}
