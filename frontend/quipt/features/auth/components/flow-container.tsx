import { type ReactNode } from 'react';

import { Icon } from 'quipt/components/icon';
import { useFlow } from './flow';

export function FlowContainer({ children }: { children: ReactNode }) {
    const { loading } = useFlow();
    return (
        <div
            data-loading={loading ? '' : undefined}
            className="sm:bg-accent-100/10 border-accent-100/30 flex w-full flex-col gap-6 overflow-hidden border p-8 data-loading:pointer-events-none data-loading:opacity-50 sm:mx-auto sm:w-120 sm:self-center sm:rounded-4xl">
            <Icon iconName="quipt-logo" className="text-primary mx-auto h-12 w-auto" />
            {children}
        </div>
    );
}
