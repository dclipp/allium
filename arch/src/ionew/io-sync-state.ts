export enum IoSyncState {
    Null,
    Busy,
    Ready
}

export type IoSyncStateInput = IoSyncState.Busy | IoSyncState.Ready;