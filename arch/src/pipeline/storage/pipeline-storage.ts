import { Mnemonic } from '@allium/types';
import { PipelineStage } from '../pipeline-stage';
import { ExecutorArgument, ExecutorJob } from '../../cpu/argument-fetcher';
import { ExecOutput } from '../../cpu/execution/exec-output';

export interface PipelineStorage {
    readonly mnemonic: Mnemonic;
    readonly stage: PipelineStage;
    readonly argument: ExecutorArgument;
    readonly job: ExecutorJob;
    readonly output: ExecOutput;
}