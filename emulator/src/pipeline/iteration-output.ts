import { Mnemonic } from '@allium/types';
import { IterationOutput, ExecutorArgument, ExecOutput, ExecutorJob, PipelineStage, PipelineStorage } from '@allium/arch';

export class AlmIterationOutput implements IterationOutput {
    public readonly hasNextStage: boolean;
    public readonly terminated: boolean;
    public readonly mnemonic: Mnemonic;
    public readonly argument: ExecutorArgument;
    public readonly stage: PipelineStage;
    public readonly job: ExecutorJob;
    public readonly output: ExecOutput;

    public constructor(storage: PipelineStorage, hasNextStage: boolean) {
        this.mnemonic = storage.mnemonic;

        if (!!storage.argument) {
            this.argument = storage.argument.duplicate();
        } else {
            this.argument = null;
        }

        this.stage = storage.stage;
        this.job = storage.job;
        this.output = !!storage.output ? storage.output.duplicate() : null;
        this.terminated = storage.mnemonic === Mnemonic.END;
        this.hasNextStage = hasNextStage;
    }
}