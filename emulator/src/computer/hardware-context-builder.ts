import { RegisterSet, MemoryModule, IoController, HardwareContext, Cpu, CpuInfo, HumanReadableCpuInfo, CpuInfoHelper, ArgumentFetcher, FlagSet, Clock, IoBus } from '@allium/arch';
import { QuadByte, ByteSequenceCreator } from '@allium/types';
import { DebugRegisterSet } from '../registers/debug-register-set';
import { DebugMemoryModule } from '../memory/debug-memory-module';
import { AlmArgumentFetcher } from '../cpu/argument-fetcher';
import { AlmFlagSet } from '../cpu/flags/flag-set';
import { DebugIoController } from '../io/debug-io-controller';
import { ClockEmulator } from '../clock/clock-emulator';
import { CpuInstance } from '../cpu/cpu-instance';
import { StandardMemoryModule } from '../memory/standard-memory-module';
// import { StandardIoController } from '../io/standard-io-controller';
import { StandardRegisterSet } from '../registers/standard-register-set';
import { StandardIoController } from '../io/standard-io-controller';

interface MutableHardwareContext<TRegisterSet extends RegisterSet, TMemoryModule extends MemoryModule, TCpu extends Cpu<TRegisterSet>, TIoController extends IoController> {
    registerSet: TRegisterSet;
    memoryModule: TMemoryModule;
    argumentFetcher: ArgumentFetcher;
    flagSet: FlagSet;
    // ioController: TIoController;
    getIoController: () => TIoController;
    getIoBus: () => IoBus;
    clock: Clock;
    cpuInfo: CpuInfo;
    cpu: TCpu;
    cycleCounter: { get: () => number, set: (v: number) => void };
    // private readonly arg: ExecutorArgument;
    // private readonly executor: InstructionExecutor;
}

export class HardwareContextBuilder {
//     public static build<TRegSet extends RegisterSet, TMemModule extends MemoryModule, TIoController extends IoController>(
//         memorySize: QuadByte, cpuInfo?: CpuInfo | Partial<HumanReadableCpuInfo>
//     ): HardwareContext<TRegSet, TMemModule, TIoController, Cpu<TRegSet>> {
// //CpuInfoHelper.toCpuInfo(cpuInfo);
//     }

    public static forDebug(memorySize: QuadByte, io: () => DebugIoController, ioBus: () => IoBus, cpuInfo?: CpuInfo | Partial<HumanReadableCpuInfo>): HardwareContext<DebugRegisterSet, DebugMemoryModule, Cpu<DebugRegisterSet>, DebugIoController> {
        const useCpuInfo = CpuInfoHelper.toCpuInfo(cpuInfo);
        const cycleCounter = HardwareContextBuilder.createCycleCounter();

        // const first = {
        //     registerSet: new DebugRegisterSet(),
        //     memoryModule: new DebugMemoryModule(memorySize),
        //     flagSet: new AlmFlagSet(),
        //     ioController: new DebugIoControllerInstance(),
        //     clock: new ClockEmulator(useCpuInfo.CLOCK_SPEED),
        //     cpuInfo: useCpuInfo
        // }

        // const second = {
        //     registerSet: first.registerSet,
        //     memoryModule: first.memoryModule,
        //     argumentFetcher: AlmArgumentFetcher.createFetcher(first),
        //     flagSet: first.flagSet,
        //     ioController: first.ioController,
        //     clock: first.clock,
        //     cpuInfo: first.cpuInfo
        // }

        const ctx: MutableHardwareContext<DebugRegisterSet, DebugMemoryModule, Cpu<DebugRegisterSet>, DebugIoController> = {
            registerSet: new DebugRegisterSet(),
            memoryModule: new DebugMemoryModule(memorySize),
            argumentFetcher: null,
            flagSet: new AlmFlagSet(),
            // ioController: ioController,
            getIoController: () => { return io() },
            getIoBus: () => { return ioBus() },
            clock: new ClockEmulator(useCpuInfo.CLOCK_SPEED, () => {
                return cycleCounter.get();
            }, (ticks) => {
                cycleCounter.set(ticks);
            }),
            cpuInfo: useCpuInfo,
            cpu: null,
            cycleCounter: {
                get: () => {
                    return cycleCounter.get();
                },
                set: (v) => {
                    cycleCounter.set(v);
                }
            }
        }

        ctx.argumentFetcher = AlmArgumentFetcher.createFetcher(ctx, () => {
            return ByteSequenceCreator.QuadByte(cycleCounter.get());
        });//TODO
        ctx.cpu = new CpuInstance(ctx);

        return ctx;
    }

    public static forStandard(memorySize: QuadByte, io: () => StandardIoController, ioBus: () => IoBus, cpuInfo: CpuInfo): HardwareContext<StandardRegisterSet, StandardMemoryModule, Cpu<StandardRegisterSet>, StandardIoController> {
        const useCpuInfo = CpuInfoHelper.toCpuInfo(cpuInfo);
        const cycleCounter = HardwareContextBuilder.createCycleCounter();

        // const ioController = new StandardIoController();
        const ctx: MutableHardwareContext<StandardRegisterSet, StandardMemoryModule, Cpu<StandardRegisterSet>, StandardIoController> = {
            registerSet: new StandardRegisterSet(),
            memoryModule: new StandardMemoryModule(memorySize),
            argumentFetcher: null,
            flagSet: new AlmFlagSet(),
            // ioController: ioController,
            getIoController: () => { return io() },
            getIoBus: () => { return ioBus() },
            clock: new ClockEmulator(useCpuInfo.CLOCK_SPEED, () => {
                return cycleCounter.get();
            }, (ticks) => {
                cycleCounter.set(ticks);
            }),
            cpuInfo: useCpuInfo,
            cpu: null,
            cycleCounter: {
                get: () => {
                    return cycleCounter.get();
                },
                set: (v) => {
                    cycleCounter.set(v);
                }
            }
        }

        ctx.argumentFetcher = AlmArgumentFetcher.createFetcher(ctx, () => {
            return ByteSequenceCreator.QuadByte(cycleCounter.get());
        });//TODO
        ctx.cpu = new CpuInstance(ctx);

        return ctx;
    }

    private static createCycleCounter(): { get: () => number, set: (v: number) => void } {
        const ccContext = {
            value: 0
        }

        return {
            get: () => {
                return ccContext.value;
            },
            set: (v) => {
                ccContext.value = v;
            }
        }
    }
}