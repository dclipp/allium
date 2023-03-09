import { ByteSequenceCreator, RealNumber, Byte } from '@allium/types';
import { IoDirection } from './io-direction';
import { IoSyncStateInput, IoSyncState } from './io-sync-state';

export interface IoInputDelegate {
    readonly direction: IoDirection.In;
    canTake(): number;
    take(count: number): Array<Byte>;
}

export interface IoOutputDelegate {
    readonly direction: IoDirection.Out;
    canPut(): number;
    put(data: Byte): void;
    flush(): void;
}

export type IoDelegate = (IoInputDelegate | IoOutputDelegate) & { readonly bufferLength: number; };

export interface IoDeviceHooks {
    onAttachedOrDetached(delegate: IoDelegate | false): void;
    onDataReceived(): void;
    onInstalled(byteSequenceCreator: typeof ByteSequenceCreator, realNumber: typeof RealNumber, deviceLog: { write(entry: string): void }, reSync: (state: IoSyncStateInput) => void): void;
    onOutOfSync(): void;
    sync(then: (state: IoSyncStateInput) => void): void;
}