import { QuadByte } from '@allium/types';
import { IterationOutput, CpuInfo, StandardComputer as IStandardComputer, HardwareContext, Cpu, IoBus } from '@allium/arch';
import { ComputerInstance } from './computer-instance';
import { StandardMemoryModule } from '../memory/standard-memory-module';
import { StandardRegisterSet } from '../registers/standard-register-set';
import { StandardIoController } from '../io/standard-io-controller';
import { HardwareContextBuilder } from './hardware-context-builder';

export class StandardComputer
    extends ComputerInstance<StandardRegisterSet, Cpu<StandardRegisterSet>, StandardMemoryModule, StandardIoController>
    implements IStandardComputer {
   
    public run(onHalt: (output: IterationOutput) => void, continueExecution?: (output: IterationOutput) => boolean): void {
        this.getClock().reset();
        let output = this.cyclePipeline();
        while ((continueExecution === undefined || continueExecution(output)) && !output.terminated) {
            output = this.cyclePipeline();
        }
        onHalt(output);
    }

    private constructor(hardwareContext: HardwareContext<StandardRegisterSet, StandardMemoryModule, Cpu<StandardRegisterSet>, StandardIoController>) {
        super('StandardComputer', hardwareContext, false);
    }

    public static create(memorySize: QuadByte, io: () => StandardIoController, ioBus: () => IoBus, cpuInfo: CpuInfo): StandardComputer {
        return new StandardComputer(HardwareContextBuilder.forStandard(memorySize, io, ioBus, cpuInfo));
    }
}
