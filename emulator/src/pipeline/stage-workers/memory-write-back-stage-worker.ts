import { AlmMemoryMutator } from '../../cpu/execution/memory-mutator';
import { PipelineWorker, PipelineStage, HardwareContext, ImmutablePipelineStorage, PipelineStorage, MutatorTarget, RegisterSet, MemoryModule, Cpu, IoController } from '@allium/arch';

export class MemoryWriteBackStageWorker implements PipelineWorker {
    public readonly STAGE = PipelineStage.MemoryWriteBack;

    public do(context: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>, storage: ImmutablePipelineStorage): PipelineStorage {
        const workingStorage = storage.toWorkingStorage();

        workingStorage.stage = PipelineStage.RegisterWriteBack;
        
        const memoryMutations = storage.output.mutators
            .filter(m => m.target === MutatorTarget.Memory)
            .map(m => m as AlmMemoryMutator);

        memoryMutations.forEach(mm => context.memoryModule.write(mm.address, mm.newValue));

        return workingStorage.finalizeStorage();
    }
}