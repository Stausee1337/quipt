import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

import { type HydrationEntryArgs, HydratingRouter } from 'quipt/components/ssr';

export default (args: HydrationEntryArgs) => {
    hydrateRoot(
        document,
        <StrictMode>
            <HydratingRouter args={args} />
        </StrictMode>,
    );
};
