import { MemoryModule } from './memory/memory-module';
import { RegisterSet } from './registers/register-set';
import { ArgumentFetcher } from './cpu/argument-fetcher';
import { FlagSet } from './cpu/flag-set';
import { Clock } from './clock/clock';
import { CpuInfo } from './cpu/info/cpu-info';
import { Cpu } from './cpu/cpu';
import { IoController } from './ionew/io-controller';
import { IoBus } from '@allium/io-bus';

export interface HardwareContext<TRegisterSet extends RegisterSet, TMemoryModule extends MemoryModule, TCpu extends Cpu<TRegisterSet>, TIoController extends IoController> {
    readonly registerSet: TRegisterSet;
    readonly memoryModule: TMemoryModule;
    readonly argumentFetcher: ArgumentFetcher;
    readonly flagSet: FlagSet;
    readonly getIoController: () => TIoController;
    readonly getIoBus: () => IoBus;
    readonly clock: Clock;
    readonly cpuInfo: CpuInfo;
    readonly cpu: TCpu;
    readonly cycleCounter: { get: () => number, set: (v: number) => void };
}