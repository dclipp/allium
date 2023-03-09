export interface FunctionScheduler {
    readonly _funs: number;
    timeout(ms: number, fn: () => void): string;
    interval(ms: number, fn: () => void): string;
    immediate(fn: () => void): void;
    cancel(handle: string): void;
}