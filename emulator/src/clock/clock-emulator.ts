import { ByteSequenceCreator, QuadByte } from '@allium/types';
import { Clock, ClockType } from '@allium/arch';

export class ClockEmulator implements Clock {
    public get type(): ClockType {
        return ClockType.Emulated;
    }

    public markCpuStart(): void {
        this._cpuStartTimestamp = Date.now();
    }

    public markCpuEnd(): void {
        this._cpuTimeDeltas.push(Math.max(0, Date.now() - this._cpuStartTimestamp));
    }

    public update(): void {
        this.computeCpuTicks();
    }

    public pause(): void {
        this._pauseTime = Date.now();
    }

    public resume(): void {
        if (this._cpuStartTimestamp > 0) {
            this._cpuStartTimestamp = Date.now() - this._pauseTime - this._cpuStartTimestamp;
        }
        this._pauseTime = 0;
    }

    public reset(): void {
        this._pauseTime = 0;
        this._cpuStartTimestamp = 0;
        while (this._cpuTimeDeltas.length > 0) {
            this._cpuTimeDeltas.pop();
        }
    }

    private computeCpuTicks(): void {
        let elapsedTime = 0;
        let actualCyclesCompleted = 0;
        while (this._cpuTimeDeltas.length > 0) {
            elapsedTime += this._cpuTimeDeltas.pop();
            actualCyclesCompleted++;
        }

        const expectedCyclesCompleted = elapsedTime / this._nominalMillisecondsRequiredPerCpuTick;
        this.setCpuCycleCount(expectedCyclesCompleted);
    }

    private setCpuCycleCount(delta: number): void {
        const previousCount = this._getPreviousCpuCycleCount();
        const maxAllowedDelta = this._MAX_QUAD_BYTE_VALUE - previousCount;
        if (maxAllowedDelta >= delta) {
            this._pushUpdatedCpuCount(delta + previousCount);
        } else {
            this._pushUpdatedCpuCount(Math.abs(maxAllowedDelta - delta));
        }
    }

    public constructor(cpuSpeedKhz: QuadByte, getPreviousCpuCycleCount: () => number, pushUpdatedCpuCount: (ticks: number) => void) {
        this._cpuStartTimestamp = 0;
        this._pauseTime = 0;
        this._cpuTimeDeltas = new Array<number>();
        this._getPreviousCpuCycleCount = getPreviousCpuCycleCount;
        this._pushUpdatedCpuCount = pushUpdatedCpuCount;
        this._MAX_QUAD_BYTE_VALUE = Math.pow(2, 32) - 1;

        // Cycles per second = cpuSpeedKhz * 1000
        // Cycles per millisecond = [Cycles per second] / 1000 ms per second
        //
        //  X milliseconds = 1 milliseconds
        //  1 cycle        = [Cycles per millisecond] cycles
        //
        // {[Cycles per millisecond] cycles} * {X milliseconds} = 1
        // X milliseconds = 1 / {[Cycles per millisecond] cycles}
        //
        // X milliseconds = 1 / {[Cycles per second] / 1000 ms per second}
        // X milliseconds = 1 / {cpuSpeedKhz * 1000 / 1000 ms per second}
        // X milliseconds = 1 / {cpuSpeedKhz}
        this._nominalMillisecondsRequiredPerCpuTick = 1 / ByteSequenceCreator.Unbox(cpuSpeedKhz);
    }

    private _cpuStartTimestamp: number;
    private _pauseTime: number;
    private readonly _cpuTimeDeltas: Array<number>;
    private readonly _getPreviousCpuCycleCount: () => number;
    private readonly _pushUpdatedCpuCount: (ticks: number) => void;
    private readonly _MAX_QUAD_BYTE_VALUE: number;
    private readonly _nominalMillisecondsRequiredPerCpuTick: number;
}
