import { IterationInterval } from './iteration-interval';
import { IterationOutput } from '../pipeline/iteration-output';
import { MemoryHitStats } from '../memory/memory-hit-stats';
import { RegisterHitStats } from '../registers/register-hit-stats';
import { CpuInfo } from '../cpu/info/cpu-info';
import { ClockType } from '../clock/clock-type';
import { Byte, QuadByte, RegisterMask, Register, VariableRegisterReference, FlagName, DynamicByteSequence } from '@allium/types';
import { Computer } from './computer';

export interface DebuggableComputer extends Computer {
    readRegisterValue(register: Register, mask?: RegisterMask): DynamicByteSequence;
    setRegisterValue(register: Register | VariableRegisterReference, newValue: DynamicByteSequence): void;

    readMemoryValue(address: QuadByte): Byte;
    setMemoryValue(address: QuadByte, value: Byte): void;

    acknowledgeFlag(flagName: FlagName): boolean;
    checkFlagSilently(flagName: FlagName): boolean;
    setFlag(flagName: FlagName, raise: boolean): void;

    getIterationInterval(): IterationInterval;
    setIterationInterval(interval: IterationInterval): void;
    iterate(): IterationOutput;

    getRegisterHitStats(): RegisterHitStats;
    getMemoryHitStats(): MemoryHitStats;

    getCpuInfo(): CpuInfo;

    setCycleCount(value: QuadByte): void;
    clockType(changeTo?: ClockType): ClockType;
}
