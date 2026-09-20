import { ComponentProps, JSX } from 'react';
import meta from 'virtual:icons-meta';

interface IconProps extends ComponentProps<'svg'> {
    iconName: string;
}

export function Icon({ iconName, ...props }: IconProps): JSX.Element {
    const { viewBox, width, height } = meta[iconName];
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            viewBox={viewBox}
            {...props}>
            <use href={`/icon-sprites.svg#${iconName}`}></use>
        </svg>
    );
}
