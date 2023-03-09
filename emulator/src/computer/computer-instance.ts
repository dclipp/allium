import { Byte, INSTRUCTION_BYTE_COUNT, ByteSequenceCreator, QuadByte, FlagHelper, Register } from '@allium/types';
import { RegisterSet, Computer, MemoryModule, Cpu, IterationOutput, IoController, Clock, HardwareContext, SerializedComputer, IoBus } from '@allium/arch';

export class ComputerInstance<TRegSet extends RegisterSet, TCpu extends Cpu<TRegSet>, TMemModule extends MemoryModule, TIoController extends IoController> implements Computer {
    private readonly _getIoController: () => TIoController;
    private readonly _getIoBus: () => IoBus;
    private readonly _isDebuggable: boolean;
    private _programBytes: Array<Byte>;
    private _cpuTerminated: boolean;
    private _clock: Clock;
    protected readonly _cpu: TCpu;
    protected readonly _memoryModule: TMemModule;
    protected readonly _exceptionPrefix: string;
    protected _cycleCounter: { get: () => number, set: (v: number) => void };

    public loadProgram(program: Array<Byte>): void {
        if (!(!!program) || program.length < INSTRUCTION_BYTE_COUNT) {
            throw new Error(`${this._exceptionPrefix}.loadProgram: The provided byte collection is too short. A program must be at least ${INSTRUCTION_BYTE_COUNT} bytes long.`);
        } else if (this._memoryModule.SIZE.isLessThan(INSTRUCTION_BYTE_COUNT)) {
            throw new Error(`${this._exceptionPrefix}.loadProgram: The length of the provided byte collection exceeds the size of the computer's memory.`);
        } else if (program.length % INSTRUCTION_BYTE_COUNT !== 0) {
            throw new Error(`${this._exceptionPrefix}.loadProgram: The length of the provided byte collection must be divisible by ${INSTRUCTION_BYTE_COUNT}.`);
        } else {
            let currentAddress = ByteSequenceCreator.QuadByte(0);
            program.forEach(b => {
                this._memoryModule.write(currentAddress, b);
                currentAddress = currentAddress.computeSum(1);
            });
            this._programBytes = program.map(b => b.clone());
        }
    }

    public advancePipeline(): IterationOutput {
        this._clock.resume();
        const output = this._cpu.iterate();
        this._clock.pause();
        this.tickClock();
        if (output.terminated) {
            this._cpuTerminated = true;
        }
        return output;
    }

    public cyclePipeline(): IterationOutput {
        this._clock.resume();
        let output = this._cpu.iterate();
        while (output.hasNextStage) {
            output = this._cpu.iterate();
            this.tickClock();
            if (output.terminated) {
                this._cpuTerminated = true;
            }
        }
        this._clock.pause();
        this.tickClock();
        return output;
    }

    public reset(): void {
        this._cpu.registerSet.wipe();
        this._cpu.flagSet.clearAllSilently();
        this._memoryModule.wipe();
        this._cycleCounter.set(0);
        this._cpuTerminated = false;
        this._clock.reset();
        this.loadProgram(this._programBytes);
    }

    public ioController(): TIoController {
        return this._getIoController();
    }

    public ioBus(): IoBus {
        return this._getIoBus();
    }

    public getClock(): Clock {
        return this._clock;
    }

    public setClock(clock: Clock): void {
        this._clock = clock;
    }

    public getCycleCount(): QuadByte {
        return ByteSequenceCreator.QuadByte(this._cycleCounter.get());
    }

    public isIdle(): boolean {
        return this._cpuTerminated;
    }

    public serialize(): SerializedComputer {
        const registers = new Array<{ readonly register: Register, readonly value: number }>();
        const registerNames = [
            Register.InstructionPtr,
            Register.Accumulator,
            Register.Monday,
            Register.Tuesday,
            Register.Wednesday,
            Register.Thursday,
            Register.Friday,
            Register.G7,
            Register.G8,
            Register.G9,
            Register.G10,
            Register.G11,
            Register.G12,
            Register.G13,
            Register.G14,
            Register.StackPtr
        ];

        registerNames.forEach(rn => {
            registers.push({
                register: rn,
                value: ByteSequenceCreator.Unbox(this._cpu.registerSet.readWhole(rn))
            });
        });

        const memory = new Array<{ readonly address: number, readonly value: number }>();
        let currentAddress = ByteSequenceCreator.QuadByte(0);
        while (currentAddress.isLessThan(this._memoryModule.SIZE)) {
            memory.push({
                address: ByteSequenceCreator.Unbox(currentAddress),
                value: ByteSequenceCreator.Unbox(this._memoryModule.read(currentAddress))
            });
            currentAddress = currentAddress.computeSum(1);
        }

        const raisedFlags = FlagHelper.FlagArray().map(f => {
            const isRaised = this._cpu.flagSet.readSilently(f);
            if (isRaised) {
                return f;
            } else {
                return null;
            }
        }).filter(f => f !== null);

        return {
            registers: registers,
            memory: memory.filter(m => m.value > 0),
            memorySize: ByteSequenceCreator.Unbox(this._memoryModule.SIZE),
            raisedFlags: raisedFlags,
            isDebuggable: this._isDebuggable,
            program: this._programBytes.map(b => ByteSequenceCreator.Unbox(b)),
            io: this._getIoController().serialize(),
            cpuInfo: {
                CLOCK_SPEED: ByteSequenceCreator.Unbox(this._cpu.info.CLOCK_SPEED),
                MODEL_IDENTIFIER: ByteSequenceCreator.Unbox(this._cpu.info.MODEL_IDENTIFIER),
                FEATURE_MASK_1: ByteSequenceCreator.Unbox(this._cpu.info.FEATURE_MASK_1),
                FEATURE_MASK_2: ByteSequenceCreator.Unbox(this._cpu.info.FEATURE_MASK_2),
                SERIAL_NUMBER: ByteSequenceCreator.Unbox(this._cpu.info.SERIAL_NUMBER)
            },
            clock: {
                value: this._cycleCounter.get(),
                type: this._clock.type
            },
            isIdle: this.isIdle()
        }
    }
    
    protected constructor(implementationName: string, hardwareContext: HardwareContext<TRegSet, TMemModule, TCpu, TIoController>, isDebuggable: boolean) {
        this._exceptionPrefix = implementationName;
        this._isDebuggable = isDebuggable;
        this._memoryModule = hardwareContext.memoryModule;
        this._cpu = hardwareContext.cpu;
        this._getIoController = () => { return hardwareContext.getIoController() };
        this._getIoBus = () => { return hardwareContext.getIoBus() };
        this._programBytes = new Array<Byte>();
        this._cycleCounter = hardwareContext.cycleCounter;
        this._cpuTerminated = false;
        this._clock = hardwareContext.clock;
    }

    private tickClock(): void {
        this._clock.update();
    }
}