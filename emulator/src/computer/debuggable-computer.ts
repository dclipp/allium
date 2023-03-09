import { VariableRegisterReference, DynamicByteSequence, QuadByte, Byte, RegisterHelper, Register, NamedRegisterMask, RegisterMask, FlagName, ByteSequenceCreator } from '@allium/types';
import { IterationOutput, CpuInfo, DebuggableComputer as IDebuggableComputer, IterationInterval, RegisterHitStats, MemoryHitStats, ClockType, HumanReadableCpuInfo, HardwareContext, Cpu, IoBus } from '@allium/arch';
import { DebugMemoryModule } from '../memory/debug-memory-module';
import { DebugRegisterSet } from '../registers/debug-register-set';
import { ComputerInstance } from './computer-instance';
import { ClockEmulator } from '../clock/clock-emulator';
import { RealTimeClock } from '../clock/real-time-clock';
import { HardwareContextBuilder } from './hardware-context-builder';
import { DebugIoController } from '../io/debug-io-controller';
import { FunctionScheduler } from '../function-scheduler';

export class DebuggableComputer
    extends ComputerInstance<DebugRegisterSet, Cpu<DebugRegisterSet>, DebugMemoryModule, DebugIoController>
    implements IDebuggableComputer {
    public readRegisterValue(register: Register, mask?: RegisterMask): DynamicByteSequence {
        return this._cpu.registerSet.readSilently(register, mask || RegisterMask(NamedRegisterMask.Full));
    }

    public setRegisterValue(register: Register | VariableRegisterReference, newValue: DynamicByteSequence): void {
        const regRef = RegisterHelper.toVariableRegisterReference(register);
        this._cpu.registerSet.writeSilently(regRef.register, regRef.mask, newValue);
    }

    public readMemoryValue(address: QuadByte): Byte {
        return this._memoryModule.readSilently(address);
    }

    public setMemoryValue(address: QuadByte, value: Byte): void {
        this._memoryModule.writeSilently(address, value);
    }

    public acknowledgeFlag(flagName: FlagName): boolean {
        return this._cpu.flagSet.acknowledge(flagName);
    }

    public checkFlagSilently(flagName: FlagName): boolean {
        return this._cpu.flagSet.readSilently(flagName);
    }

    public setFlag(flagName: FlagName, raise: boolean): void {
        if (raise) {
            this._cpu.flagSet.raiseFlag(flagName);
        } else {
            this._cpu.flagSet.clearSilently(flagName);
        }
    }

    public getIterationInterval(): IterationInterval {
        return this._executionInterval;
    }

    public setIterationInterval(interval: IterationInterval): void {
        this._executionInterval = interval;
    }

    public iterate(): IterationOutput {
        let output: IterationOutput = null;
        if (this.getIterationInterval() === IterationInterval.PipelineStage) {
            output = this.advancePipeline();
        } else {
            output = this.cyclePipeline();
        }

        this._latestRegisterHits = this._registerSet.getHits();
        this._latestMemoryHits = this._memoryModule.getHits();
        this._registerSet.resetHitStats();
        this._memoryModule.resetHitStats();
        
        return output;
    }

    public loadProgram(program: Array<Byte>): void {
        this._memoryModule.resetHitStats();
        super.loadProgram(program);
    }

    public getRegisterHitStats(): RegisterHitStats {
        return this._latestRegisterHits;
    }
    
    public getMemoryHitStats(): MemoryHitStats {
        return this._latestMemoryHits;
    }
    
    public getCpuInfo(): CpuInfo {
        return this._cpu.info;
    }

    public setCycleCount(value: QuadByte): void {
        if (value.isGreaterThanOrEqualTo(0)) {
            this._cycleCounter.set(ByteSequenceCreator.Unbox(value));
        } else {
            throw new Error(`${this._exceptionPrefix}.setCycleCount: Cycle count must be a non-negative integer.`);
        }
    }

    public clockType(changeTo?: ClockType): ClockType {
        if (changeTo !== undefined) { // update
            if (changeTo !== this.getClock().type) {
                if (changeTo === ClockType.Emulated) {
                    this.setClock(new ClockEmulator(
                        this._cpuInfo.CLOCK_SPEED,
                        () => { return ByteSequenceCreator.Unbox(this.getCycleCount()) }, (cycleCount) => { this.setCycleCount(ByteSequenceCreator.QuadByte(cycleCount)) } )
                    );
                } else if (changeTo === ClockType.Real) {
                    this.setClock(new RealTimeClock(() => { return ByteSequenceCreator.Unbox(this.getCycleCount()) }, (cycleCount) => { this.setCycleCount(ByteSequenceCreator.QuadByte(cycleCount)) }));
                }
            }
        }
        return this.getClock().type;
    }

    private constructor(hardwareContext: HardwareContext<DebugRegisterSet, DebugMemoryModule, Cpu<DebugRegisterSet>, DebugIoController>) {
        super('DebuggableComputer', hardwareContext, true);
        this._registerSet = new DebugRegisterSet();
        this._cpuInfo = hardwareContext.cpuInfo;
        // this._ioLog = new IoLog();
        this._executionInterval = IterationInterval.PipelineStage;
        this._latestRegisterHits = this._cpu.registerSet.getHits();
        this._latestMemoryHits = this._memoryModule.getHits();
    }

    public static create(
        memorySize: QuadByte,
        io: (() => DebugIoController) | { readonly scheduler: FunctionScheduler, capacity: number },
        ioBus: () => IoBus,
        cpuInfo?: CpuInfo | Partial<HumanReadableCpuInfo>): DebuggableComputer {
        let useIo: () => DebugIoController;

        if (Object.getOwnPropertyNames(io).includes('scheduler')) {
            const opts = io as { readonly scheduler: FunctionScheduler, capacity: number };
            if (opts.capacity > Math.pow(2, 16) - 1) {
                throw new Error('Capacity must be less than 65536');
            } else {
                const ioc = new DebugIoController(opts.scheduler, ByteSequenceCreator.DoubleByte(opts.capacity));
                useIo = () => {
                    return ioc;
                }
            }
        } else {
            useIo = () => { return (io as () => DebugIoController)(); };
        }
        
        return new DebuggableComputer(HardwareContextBuilder.forDebug(memorySize, useIo, ioBus, cpuInfo));
    }

    private _latestRegisterHits: RegisterHitStats;
    private _latestMemoryHits: MemoryHitStats;
    private _executionInterval: IterationInterval;
    // private readonly _ioLog: IoLog;
    private readonly _registerSet: DebugRegisterSet;
    private readonly _cpuInfo: CpuInfo;
}
