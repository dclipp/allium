import { Mnemonic } from '@allium/types';
import { PipelineStage, PipelineStorage, ExecutorJob, ExecOutput, WorkingPipelineStorage, ExecutorArgument } from '@allium/arch';

export class AlmWorkingPipelineStorage implements WorkingPipelineStorage {
    private _mnemonic: Mnemonic = null;
    private _argument: ExecutorArgument = null;
    private _stage: PipelineStage = null;
    private _job: ExecutorJob = null;
    private _output: ExecOutput = null;

    public get mnemonic(): Mnemonic {
        return this._mnemonic;
    }

    public get argument(): ExecutorArgument {
        return this._argument;
    }

    public get stage(): PipelineStage {
        return this._stage;
    }

    public get job(): ExecutorJob {
        return this._job;
    }

    public get output(): ExecOutput {
        return this._output;
    }

    public set mnemonic(mnemonic: Mnemonic) {
        this._mnemonic = mnemonic;

    }

    public set argument(argument: ExecutorArgument) {
        if (!!argument) {
            this._argument = argument.duplicate();
        } else {
            this._argument = null;
        }
    }

    public set stage(stage: PipelineStage) {
        this._stage = stage;
    }

    public set job(job: ExecutorJob) {
        this._job = job;
    }

    public set output(output: ExecOutput) {
        this._output = !!output ? output.duplicate() : null;
    }

    public finalizeStorage(): PipelineStorage {
        const storage = {};
        Object.defineProperty(storage, 'mnemonic', {
            writable: false,
            value: this._mnemonic
        });
        Object.defineProperty(storage, 'argument', {
            writable: false,
            value: !!this._argument ? this._argument.duplicate() : null
        });
        Object.defineProperty(storage, 'stage', {
            writable: false,
            value: this._stage
        });
        Object.defineProperty(storage, 'job', {
            writable: false,
            value: this._job
        });
        Object.defineProperty(storage, 'output', {
            writable: false,
            value: !!this._output ? this._output.duplicate() : null
        });

        return storage as PipelineStorage;
    }

    public constructor(_mnemonic: Mnemonic, _argument: ExecutorArgument, _stage: PipelineStage,
        _job: ExecutorJob, _output: ExecOutput,) {
        this.mnemonic = _mnemonic;

        if (!!_argument) {
            this._argument = _argument.duplicate();
        } else {
            this._argument = null;
        }

        this.stage = _stage;
        this.job = _job;
        this.output = !!_output ? _output.duplicate() : null;
    }
}
