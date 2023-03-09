import { IoPortStatus } from './io-port-status';
import { IoPort } from './io-port';
import { IoBusLog } from './io-bus-log';
import { DeviceProfile } from '@allium/types';

export interface IoBus {
    getPortStatus(portIndex: number): IoPortStatus;
    usePort(portIndex: number, clientToHostBufferSize: number, hostToClientBufferSize: number, profile: DeviceProfile, enableDebugLogging?: boolean): void;
    freePort(portIndex: number): void;
    getPort(portIndex: number): IoPort | null;
    getActiveIndices(): Array<number>;
    getLog(): IoBusLog;
}
