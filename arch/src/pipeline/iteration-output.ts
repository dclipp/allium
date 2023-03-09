import { PipelineStorage } from './storage/pipeline-storage';

export interface IterationOutput extends PipelineStorage {
    readonly hasNextStage: boolean;
    readonly terminated: boolean;
}