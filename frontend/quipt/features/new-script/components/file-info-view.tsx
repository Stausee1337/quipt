import { type JSX } from 'react';

import { Icon } from 'quipt/components/icon';

const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

function formatFileSize(bytes: number): string {
    let size = bytes;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
    }

    return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function FileInfoView({ file }: { file: File }): JSX.Element {
    return (
        <div className="flex p-2">
            <Icon iconName="file-pdf" className="icon-2xl" aria-hidden="true" />
            <div className="flex flex-col">
                <p>{file.name}</p>
                <p className="text-info text-accent-100">{formatFileSize(file.size)}</p>
            </div>
        </div>
    );
}
