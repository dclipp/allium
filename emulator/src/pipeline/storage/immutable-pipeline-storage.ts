import { AlmWorkingPipelineStorage } from './working-pipeline-storage';
import { PipelineStage, ImmutablePipelineStorage, PipelineStorage, ExecutorJob, ExecOutput, WorkingPipelineStorage, ExecutorArgument } from '@allium/arch';
import { Mnemonic } from '@allium/types';

export class AlmImmutablePipelineStorage implements ImmutablePipelineStorage {
    public readonly mnemonic: Mnemonic;
    public readonly argument: ExecutorArgument;
    public readonly stage: PipelineStage;
    public readonly job: ExecutorJob;
    public readonly output: ExecOutput;

    public toWorkingStorage(): WorkingPipelineStorage {
        return new AlmWorkingPipelineStorage(
            this.mnemonic,
            this.argument,
            this.stage,
            this.job,
            this.output
        );
    }

    public static extendFrom(storage: PipelineStorage): ImmutablePipelineStorage {
        return new AlmImmutablePipelineStorage(storage.mnemonic, storage.argument, storage.stage, storage.job, storage.output);
    }

    public static coldConstruct(mnemonic: Mnemonic, argument: ExecutorArgument, stage: PipelineStage,
        job: ExecutorJob, output: ExecOutput): ImmutablePipelineStorage {
        return new AlmImmutablePipelineStorage(mnemonic, argument, stage, job, output);
    }

    private constructor(_mnemonic: Mnemonic, _argument: ExecutorArgument, _stage: PipelineStage,
        _job: ExecutorJob, _output: ExecOutput) {
        this.mnemonic = _mnemonic;

        if (!!_argument) {
            this.argument = _argument.duplicate();
        } else {
            this.argument = null;
        }

        this.stage = _stage;
        this.job = _job;
        this.output = !!_output ? _output.duplicate() : null;
    }
}