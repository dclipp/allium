import { IoBus } from '../public/io-bus';
import { IoPortStatus } from '../public/io-port-status';
import { IoPort } from '../public/io-port';
import { Port } from './port';
import { IoBusLog } from '../public/io-bus-log';
import { BusLog } from './bus-log';
import { DeviceProfile } from '@allium/types';

export class Bus implements IoBus {
    public getPortStatus(portIndex: number): IoPortStatus {
        const port = this._activePorts.get(portIndex);
        if (!!port) {
            return port.status;
        } else {
            return IoPortStatus.Null;
        }
    }

    public usePort(portIndex: number, clientToHostBufferSize: number, hostToClientBufferSize: number, profile: DeviceProfile, enableDebugLogging?: boolean): void {
        if (this.getPortStatus(portIndex) === IoPortStatus.Null) {
            if (!Number.isInteger(clientToHostBufferSize) || clientToHostBufferSize < 0 || clientToHostBufferSize > 256) {
                throw new Error('invalid buffer size: clientToHostBuffer');
            } else if (!Number.isInteger(hostToClientBufferSize) || hostToClientBufferSize < 0 || hostToClientBufferSize > 256) {
                throw new Error('invalid buffer size: hostToClientBuffer');
            } else if (clientToHostBufferSize + hostToClientBufferSize > 256) {
                throw new Error(`total port buffer size exceeds single byte length: ${clientToHostBufferSize + hostToClientBufferSize}`);
            } else {
                this._activePorts.set(portIndex, {
                    portObject: new Port(clientToHostBufferSize, hostToClientBufferSize, profile, (message) => {
                        this._log.appendMessage(portIndex, message);
                    }, enableDebugLogging === true),
                    status: clientToHostBufferSize > 0 && hostToClientBufferSize > 0
                        ? IoPortStatus.FullDuplex
                        : clientToHostBufferSize > 0 && hostToClientBufferSize === 0
                        ? IoPortStatus.ClientWritable
                        : clientToHostBufferSize === 0 && hostToClientBufferSize > 0
                        ? IoPortStatus.HostWritable
                        : IoPortStatus.Reserved
                });
            }
        } else {
            throw new Error(`port is already in use: ${portIndex}`);
        }
    }

    public freePort(portIndex: number): void {
        if (!this._activePorts.delete(portIndex)) {
            throw new Error(`port is not in use: ${portIndex}`);
        }
    }

    public getPort(portIndex: number): IoPort | null {
        const p = this._activePorts.get(portIndex);
        return !!p ? p.portObject : null;
    }

    public getActiveIndices(): Array<number> {
        const indices = new Array<number>();
        const itr = this._activePorts.keys();
        let current = itr.next();
        while (current.done !== true) {
            indices.push(current.value);
            current = itr.next();
        }

        return indices;
    }

    public getLog(): IoBusLog {
        return this._log;
    }

    public constructor() {
        this._activePorts = new Map<number, {
            readonly portObject: IoPort;
            readonly status: IoPortStatus;
        }>();
        this._log = new BusLog();
    }

    private readonly _activePorts: Map<number, {
        readonly portObject: IoPort;
        readonly status: IoPortStatus;
    }>;

    private readonly _log: BusLog;
}