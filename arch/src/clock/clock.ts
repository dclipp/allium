import { ClockType } from './clock-type';

export interface Clock {
    readonly type: ClockType;
    
    markCpuStart(): void;
    markCpuEnd(): void;

    pause(): void;
    resume(): void;
    reset(): void;

    update(): void;
}