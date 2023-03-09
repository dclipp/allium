import { PipelineStage } from './pipeline-stage';
import { IterationOutput } from './iteration-output';

export interface Pipeline {
    readonly CurrentStage: PipelineStage;
    advance(): IterationOutput;
}
