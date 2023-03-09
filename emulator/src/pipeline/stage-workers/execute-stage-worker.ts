import { PipelineWorker, PipelineStage, HardwareContext, ImmutablePipelineStorage, PipelineStorage, RegisterSet, MemoryModule, Cpu, IoController } from '@allium/arch';

export class ExecuteStageWorker implements PipelineWorker {
    public readonly STAGE = PipelineStage.Execute;

    public do(context: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>, storage: ImmutablePipelineStorage): PipelineStorage {
        const workingStorage = storage.toWorkingStorage();

        workingStorage.stage = PipelineStage.MemoryWriteBack;
        workingStorage.output = storage.job(context.registerSet, context.flagSet, context.getIoController);

        return workingStorage.finalizeStorage();
    }
}