import { PipelineWorker, PipelineStage, HardwareContext, ImmutablePipelineStorage, PipelineStorage, RegisterSet, MemoryModule, Cpu, IoController } from '@allium/arch';

export class FetchStageWorker implements PipelineWorker {
    public readonly STAGE = PipelineStage.Fetch;

    public do(context: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>, storage: ImmutablePipelineStorage): PipelineStorage {
        const workingStorage = storage.toWorkingStorage();

        workingStorage.stage = PipelineStage.Execute;
        workingStorage.job = context.argumentFetcher(storage.mnemonic, storage.argument);

        return workingStorage.finalizeStorage();
    }
}