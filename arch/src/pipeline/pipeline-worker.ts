import { PipelineStage } from './pipeline-stage';
import { ImmutablePipelineStorage } from './storage/immutable-pipeline-storage';
import { PipelineStorage } from './storage/pipeline-storage';
import { HardwareContext } from '../hardware-context';
import { RegisterSet } from '../registers/register-set';
import { MemoryModule } from '../memory/memory-module';
import { Cpu } from '../cpu/cpu';
import { IoController } from '../ionew/io-controller';

export interface PipelineWorker {
    readonly STAGE: PipelineStage;
    do(context: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>, storage: ImmutablePipelineStorage): PipelineStorage;
}