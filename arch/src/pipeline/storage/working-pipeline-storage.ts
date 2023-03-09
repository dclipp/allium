import { Mnemonic } from '@allium/types';
import { ExecutorArgument, ExecutorJob } from '../../cpu/argument-fetcher';
import { PipelineStage } from '../pipeline-stage';
import { ExecOutput } from '../../cpu/execution/exec-output';
import { PipelineStorage } from './pipeline-storage';

export interface WorkingPipelineStorage {
    mnemonic: Mnemonic;
    argument: ExecutorArgument;
    stage: PipelineStage;
    job: ExecutorJob;
    output: ExecOutput;

    finalizeStorage(): PipelineStorage;
}

