import signinFlow from './flows/signin-flow';
import signupFlow from './flows/signup-flow';
import { FlowLink, routedFlowsManager, useFlowUrl } from './components/flow-entry';

export default routedFlowsManager(signinFlow, signupFlow);

export {
    FlowLink,
    signinFlow,
    signupFlow,
    useFlowUrl,
};

