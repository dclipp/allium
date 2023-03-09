import { Clock, ClockType } from '@allium/arch';

export class RealTimeClock implements Clock {
    public get type(): ClockType {
        return ClockType.Real;
    }

    public markCpuStart(): void {
    }

    public markCpuEnd(): void {
        this.updateCpuTicks(1);
    }

    public pause(): void {
    }

    public resume(): void {
    }

    public reset(): void {
    }

    public update(): void {
    }

    public constructor(getPreviousCpuCycleCount: () => number, pushUpdatedCpuCycleCount: (cycleCount: number) => void) {
        this._getPreviousCpuCycleCount = getPreviousCpuCycleCount;
        this._pushUpdatedCpuCycleCount = pushUpdatedCpuCycleCount;
        this._MAX_QUAD_BYTE_VALUE = Math.pow(2, 32) - 1;
    }

    private updateCpuTicks(delta: number): void {
        const previousTicks = this._getPreviousCpuCycleCount();
        const maxDelta = this._MAX_QUAD_BYTE_VALUE - previousTicks;
        if (maxDelta >= delta) {
            this._pushUpdatedCpuCycleCount(previousTicks + delta);
        } else {
            this._pushUpdatedCpuCycleCount(delta - maxDelta);
        }
    }

    private readonly _getPreviousCpuCycleCount: () => number;
    private readonly _pushUpdatedCpuCycleCount: (ticks: number) => void;
    private readonly _MAX_QUAD_BYTE_VALUE: number;
}
