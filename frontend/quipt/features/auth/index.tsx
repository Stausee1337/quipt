
import signinFlow from './components/signin-flow';
import { routedFlowsManager } from './components/flow-entry';
// import { HydrationBoundary } from 'quipt/components/hydration-boundary';

export default routedFlowsManager({
    basename: 'auth',
    entries: [signinFlow]
});

