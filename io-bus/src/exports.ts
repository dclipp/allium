import { Bus } from './private/bus';
import { IoBus } from './public/io-bus';

export { IoPort } from './public/io-port';
export { IoPortStatus } from './public/io-port-status';
export { IoBus } from './public/io-bus';
export { IoBusLog } from './public/io-bus-log';

export * from '@allium/types';

export function createIoBus(): IoBus {
    return new Bus();
}
