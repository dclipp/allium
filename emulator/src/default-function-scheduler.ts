import { FunctionScheduler } from './function-scheduler';

declare var setImmediate: any;
declare var cancelTimeout: any;
declare var cancelInterval: any;

export const defaultFunctionScheduler: FunctionScheduler = {
    _funs: -1,
    timeout: (ms: number, fn: () => void) => {
        return 't' + setTimeout(() => {
            fn();
        }, ms).toString();
    },
    interval: (ms: number, fn: () => void) => {
        return 'i' + setInterval(() => {
            fn();
        }, ms).toString();
    },
    immediate: (fn: () => void) => {
        setImmediate(() => {
            fn();
        });
    },
    cancel: (handle: string) => {
        if (handle.startsWith('t')) {
            cancelTimeout(handle.substring(1));
        } else if (handle.startsWith('i')) {
            cancelInterval(handle.substring(1));
        }
    }
};