import { type ComponentProps, type JSX, memo } from 'react';
import meta from 'virtual:icons-meta';

interface IconProps extends ComponentProps<'svg'> {
    iconName: string;
}

export const Icon = memo(({ iconName, ...props }: IconProps): JSX.Element => {
    try {
        const { viewBox, width, height } = meta.iconData[iconName];
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={width}
                height={height}
                viewBox={viewBox}
                {...props}>
                <use href={`/${meta.fileName}#${iconName}`}></use>
            </svg>
        );
    } catch {
        return <img />;
    }
});
