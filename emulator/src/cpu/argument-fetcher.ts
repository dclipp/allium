import { AlmInstructionExecutor } from './execution/instruction-executor';
import { DynamicByteSequence, QuadByte, Mnemonic, VariableRegisterReference, FlagName } from '@allium/types';
import { NullExecutorArgument, CpuInfo, ExecutorArgument, IoController, ArgumentFetcher, FlagSet, MemoryModule, RegisterSet, ExecutorArgumentHelper, HardwareContext, Cpu } from '@allium/arch';
import { FetcherContext } from '../argument/fetcher-context';
import { AlmExecOutput } from './execution/exec-output';

export class AlmExecutorArgument implements ExecutorArgument {
    public variableRegisterName1: VariableRegisterReference | NullExecutorArgument;
    public variableRegisterName2: VariableRegisterReference | NullExecutorArgument;
    public variableRegisterName3: VariableRegisterReference | NullExecutorArgument;
    public inlineValue: DynamicByteSequence | NullExecutorArgument;
	
	public constructor() {
        this.variableRegisterName1 = ExecutorArgumentHelper.createNullArg();
		this.variableRegisterName2 = ExecutorArgumentHelper.createNullArg();
		this.variableRegisterName3 = ExecutorArgumentHelper.createNullArg();
		this.inlineValue = ExecutorArgumentHelper.createNullArg();

    }
    
    public duplicate(): ExecutorArgument {
        const copy = new AlmExecutorArgument();
        if (!ExecutorArgumentHelper.isNullExecutorArgument(this.inlineValue)) {
            copy.inlineValue = this.inlineValue.clone();
        }
        if (!ExecutorArgumentHelper.isNullExecutorArgument(this.variableRegisterName1)) {
            copy.variableRegisterName1 = VariableRegisterReference.create(
                this.variableRegisterName1.register,
                this.variableRegisterName1.mask);
        }
        if (!ExecutorArgumentHelper.isNullExecutorArgument(this.variableRegisterName2)) {
            copy.variableRegisterName2 = VariableRegisterReference.create(
                this.variableRegisterName2.register,
                this.variableRegisterName2.mask);
        }
        if (!ExecutorArgumentHelper.isNullExecutorArgument(this.variableRegisterName3)) {
            copy.variableRegisterName3 = VariableRegisterReference.create(
                this.variableRegisterName3.register,
                this.variableRegisterName3.mask);
        }
        return copy;
    }
}

export class AlmArgumentFetcher {
	public static createFetcher(hardwareContext: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>, cycleCountFetcher: () => QuadByte): ArgumentFetcher {
        const fn = (opName: Mnemonic | null, arg: ExecutorArgument) => () => {
            if (opName === null) {
                return new AlmExecOutput({
                    flags: [FlagName.IllegalInstruction]
                });
            } else {
                const executor = new AlmInstructionExecutor(hardwareContext, cycleCountFetcher);
                const context = new FetcherContext(arg, executor, hardwareContext);
                return context.invoke(opName);
            }
        }

        return fn;
    }

    private constructor() {
        
    }
}
