import signinFlow from './flows/signin-flow';
import signupFlow from './flows/signup-flow';
import { routedFlowsManager } from './components/flow-entry';

export default routedFlowsManager(signinFlow, signupFlow);
