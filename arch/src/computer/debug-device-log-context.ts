export interface DebugDeviceLogContext {
    clear(): void;
    appendEntry(s: string): void;

    readonly entries: ReadonlyArray<{ readonly timestamp: number; readonly s: string; }> & {
        subscribe(subscriber: (entries: Array<{ readonly timestamp: number; readonly s: string; }>) => void): {
            unsubscribe(): void;
        };
    };
}