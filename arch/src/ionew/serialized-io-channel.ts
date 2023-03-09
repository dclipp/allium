import { IoDirection } from './io-direction';
import { IoSyncState } from './io-sync-state';

export interface SerializedIoChannel {
    readonly channelNumeric: number;
    readonly state: IoSyncState;
    readonly isAttached: boolean;
    readonly testMode: boolean;
    readonly outOfSync: boolean;
    readonly logEntries: Array<{ readonly timestamp: number; readonly entry: string; }>;
    readonly buffer: {
        readonly committedBytes: Array<number>,
        readonly uncommittedBytes: Array<number>,
        readonly size: number
    };
    // readonly hooks: IoLazyHooks;
    readonly direction: IoDirection;
    readonly syncInterval: 50 | 100 | 200 | 400 | 800;
}