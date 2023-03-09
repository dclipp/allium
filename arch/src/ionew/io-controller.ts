import { Byte } from '@allium/types';
import { IoSyncState } from './io-sync-state';
import { IoBidirectionalInstallation } from './io-bidirectional-installation';
import { IoWriteOnlyInstallation } from './io-write-only-installation';
import { IoReadOnlyInstallation } from './io-read-only-installation';
import { IoDirection } from './io-direction';
import { IoDeviceHooks } from './io-device-hooks';
import { SerializedIoInstallation } from './serialized-io-installation';

export interface IoController {
    installBidirectional(installation: IoBidirectionalInstallation): void;
    installWriteOnly(installation: IoWriteOnlyInstallation): void;
    installReadOnly(installation: IoReadOnlyInstallation): void;
    uninstall(channel: Byte): void;

    provideHooks(channel: Byte, hooks: IoDeviceHooks): void;

    attach(channel: Byte): void;
    detach(channel: Byte): void;

    statuses(): Array<{ readonly channel: Byte, readonly state: IoSyncState, readonly installationKey: string, readonly installationTitle: string }>;

    canPut(channel: Byte): number;
    put(channel: Byte, data: Byte): void;
    flush(channel: Byte): void;
    canTake(channel: Byte): number;
    take(channel: Byte, count: number): Array<Byte>;
    getDirection(channel: Byte): IoDirection | false;

    appendToLog(channel: Byte, entry: string): void;
    clearLog(channel: Byte): void;
    getLog(channel: Byte): Array<{ readonly timestamp: number, readonly entry: string }>;
    log(channel: Byte, listener: (latest: { readonly timestamp: number, readonly entry: string }) => void): { unsubscribe(): void };

    serialize(): Array<SerializedIoInstallation>;
}