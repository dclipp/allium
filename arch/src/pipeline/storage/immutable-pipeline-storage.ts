import { PipelineStorage } from './pipeline-storage';
import { WorkingPipelineStorage } from './working-pipeline-storage';

export interface ImmutablePipelineStorage extends PipelineStorage {
    toWorkingStorage(): WorkingPipelineStorage;
}
