import React, {
    useId,
    useImperativeHandle,
    useRef,
    type ComponentProps,
    type JSX,
    type RefObject,
} from 'react';

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

function ActorEditMenu(props: {
    menuHandle: Menu.Handle<any>;
    actor: ActorKey;
}): JSX.Element | null {
    const inputId = useId();
    const manager = useScriptEditorManager();
    const isSelfActor = useScriptEditorStateAccessor(state => state.selfActor === props.actor);

    const actor = useKeyedState(props.actor, () => {
        props.menuHandle.close();
    });

    // const countRef = useRef(0);
 
    // useLayoutEffect(() => {
    //     console.log('count', countRef.current);
    //     if (countRef.current === 0) {
    //         manager.dispatchStateAction(actions.editActorBegin, props.actor);
    //         countRef.current++;
    //     }
    // }, []);

    if (actor === null) return null;

    return (
        <MenuBox>
            <Input
                className="mx-2"
                placeholder="Spieler benennen"
                id={inputId}
                value={actor.name}
                onValueChange={(value, event) =>
                    manager.dispatchStateAction(actions.renameActor, {
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
                    manager.dispatchStateAction(actions.changeActorColor, {
                        actorKey: props.actor,
                        newColor: color,
                    })
                }
            />
            <MenuSeparator />
            <MenuCheckboxItem
                checked={isSelfActor}
                onCheckedChange={() =>
                    manager.dispatchStateAction(actions.toggleActorMarkedAsSelf, props.actor)
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

export interface ActorsContainerActions {
    editActor(actor: ActorKey): void;
}

export interface ActorsContainerProps extends ComponentProps<'div'> {
    actors: readonly ActorKey[] | Map<ActorKey, number>;
    actionsRef?: RefObject<ActorsContainerActions | null> | undefined;
}

function* actorsIterator(
    actors: readonly ActorKey[] | Map<ActorKey, number>,
): Generator<[ActorKey, number | undefined]> {
    if (actors instanceof Map) for (let entry of actors.entries()) yield entry;
    else for (let key of actors) yield [key, undefined];
}

function displayForCount(count: number | undefined) {
    return count !== undefined
        ? {
              display(name: string) {
                  return `${name} (${count})`;
              },
          }
        : {};
}

type DetectActorEditProps = {
    onClick: React.MouseEventHandler<HTMLElement>
};

function detectActorEdit(onActorEdit: () => void): DetectActorEditProps {
    // Specificially detects user intent to edit an actor, not popup open
    return {
        onClick(event) {
            const target = event.currentTarget;
            setTimeout(() => {
                if ('popupOpen' in target.dataset)
                    onActorEdit();
            });
        },
    }
}

export function ActorsContainer({
    actors,
    actionsRef,
    className,
    children,
    ...props
}: ActorsContainerProps): JSX.Element {
    const actorMenuHandleRef = useRef<Menu.Handle<{ actor: ActorKey }>>(undefined);
    if (actorMenuHandleRef.current === undefined)
        actorMenuHandleRef.current = Menu.createHandle<{ actor: ActorKey }>();

    const selfActor = useScriptEditorStateAccessor(state => state.selfActor);
    const hasSelfActor =
        selfActor === null
            ? null
            : actors instanceof Map
              ? actors.has(selfActor)
              : actors.includes(selfActor);

    const manager = useScriptEditorManager();

    useImperativeHandle(actionsRef, () => ({
        editActor(actor) {
            actorMenuHandleRef.current?.open(actor);
        },
    }));

    function handleEditActor(actorKey: ActorKey) {
        manager.dispatchStateAction(actions.editActorBegin, actorKey);
    }

    return (
        <div className={className} {...props}>
            {selfActor && hasSelfActor && (
                <Menu.Trigger
                    key={selfActor}
                    id={selfActor}
                    handle={actorMenuHandleRef.current}
                    payload={{ actor: selfActor }}
                    render={
                        <ActorPill
                            actorKey={selfActor}
                            selected
                            interactable
                            {...displayForCount(
                                actors instanceof Map ? actors.get(selfActor) : undefined,
                            )}
                        />
                    }
                    {...detectActorEdit(() => handleEditActor(selfActor))}
                />
            )}
            {Array.from(actorsIterator(actors)
                .filter(([actor]) => actor !== selfActor)
                .map(([actor, count]) => (
                    <Menu.Trigger
                        key={actor}
                        id={actor}
                        handle={actorMenuHandleRef.current}
                        payload={{ actor }}
                        render={
                            <ActorPill actorKey={actor} interactable {...displayForCount(count)} />
                        }
                        {...detectActorEdit(() => handleEditActor(actor))}
                    />
                )))}
            <Menu.Root handle={actorMenuHandleRef.current}
                onOpenChangeComplete={open => !open && manager.commitTransaction(actions.editActorTransaction)}>
                {({ payload }) => (
                    <Menu.Portal>
                        <Menu.Positioner sideOffset={8} align="start" className="outline-hidden">
                            <Menu.Popup className={popupClass}>
                                {payload?.actor && (
                                    <ActorEditMenu
                                        menuHandle={actorMenuHandleRef.current!}
                                        actor={payload.actor}
                                    />
                                )}
                            </Menu.Popup>
                        </Menu.Positioner>
                    </Menu.Portal>
                )}
            </Menu.Root>
            {children}
        </div>
    );
}

export declare namespace ActorsContainer {
    export type Actions = ActorsContainerActions;
}
