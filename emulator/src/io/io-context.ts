import { IoChannel } from './io-channel';
import { IoSyncState, IoDirection } from '@allium/arch';
import { IoLazyHooks } from './io-lazy-hooks';

export interface IoContext {
    state: IoSyncState;
    isAttached: boolean;
    syncHandle: string;
    testMode: boolean;
    outOfSync: boolean;
    readonly entries: Array<{ readonly timestamp: number; readonly entry: string; }>;
    readonly channel: IoChannel;
    readonly hooks: IoLazyHooks;
    readonly direction: IoDirection;
    readonly syncInterval: 50 | 100 | 200 | 400 | 800;
}