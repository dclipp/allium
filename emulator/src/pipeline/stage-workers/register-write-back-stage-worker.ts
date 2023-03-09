import { AlmRegisterMutator } from '../../cpu/execution/register-mutator';
import { PipelineWorker, PipelineStage, HardwareContext, ImmutablePipelineStorage, PipelineStorage, MutatorTarget, RegisterSet, MemoryModule, Cpu, IoController } from '@allium/arch';

export class RegisterWriteBackStageWorker implements PipelineWorker {
    public readonly STAGE = PipelineStage.RegisterWriteBack;

    public do(context: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>, storage: ImmutablePipelineStorage): PipelineStorage {
        const workingStorage = storage.toWorkingStorage();

        workingStorage.stage = PipelineStage.Done;
        
        const registerMutations = storage.output.mutators
            .filter(m => m.target === MutatorTarget.Register)
            .map(m => m as AlmRegisterMutator);

        registerMutations.forEach(rm => context.registerSet.writeMasked(rm.register, rm.mask, rm.newValue));

        storage.output.flags
            .forEach(f => context.flagSet.raiseFlag(f));


        return workingStorage.finalizeStorage();
    }
}