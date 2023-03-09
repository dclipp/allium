import { DecodeStageWorker } from './stage-workers/decode-stage-worker';
import { FetchStageWorker } from './stage-workers/fetch-stage-worker';
import { ExecuteStageWorker } from './stage-workers/execute-stage-worker';
import { MemoryWriteBackStageWorker } from './stage-workers/memory-write-back-stage-worker';
import { RegisterWriteBackStageWorker } from './stage-workers/register-write-back-stage-worker';
import { AlmImmutablePipelineStorage } from './storage/immutable-pipeline-storage';
import { INSTRUCTION_BYTE_COUNT, Register } from '@allium/types';
import { PipelineStage, HardwareContext, PipelineWorker, IterationOutput, ImmutablePipelineStorage, Pipeline, MutatorTarget, RegisterMutator, RegisterSet, MemoryModule, IoController, Cpu } from '@allium/arch';
import { AlmIterationOutput } from './iteration-output';

export class AlmPipeline implements Pipeline {
    private _stage: PipelineStage = PipelineStage.Decode;
    private _storage: ImmutablePipelineStorage = null;
    
    private readonly _hardwareContext: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>;

    public constructor(hardwareContext: HardwareContext<RegisterSet, MemoryModule, Cpu<RegisterSet>, IoController>) {
        this._hardwareContext = hardwareContext;
    }

    public get CurrentStage(): PipelineStage {
        return this._stage;
    }

    public advance(): IterationOutput {
        let hasNextStage = true;

        if (this._stage === PipelineStage.Done) {
            this._stage = PipelineStage.Decode;
            hasNextStage = false;

            const instructionPtrChanged = this.didInstructionPtrChange();
            if (!instructionPtrChanged) {
                const currentInsPtrAddress = this._hardwareContext.registerSet.readWhole(Register.InstructionPtr);
                if (currentInsPtrAddress.isLessThan(this._hardwareContext.memoryModule.SIZE.computeDifference(INSTRUCTION_BYTE_COUNT))) {
                    this._hardwareContext.registerSet.writeWhole(
                        Register.InstructionPtr,
                        currentInsPtrAddress.computeSum(INSTRUCTION_BYTE_COUNT)
                    );
                }
            }
            
            this._hardwareContext.clock.markCpuEnd();
        } else {
            if (this._storage === null) { // First stage, prepare for decode
                this._hardwareContext.clock.markCpuStart();
                this._storage = AlmImmutablePipelineStorage.coldConstruct(null, null, PipelineStage.Decode, null, null);
            }
            
            this._stage = this._storage.stage;

            const latestStorage = this._workers[this._stage.valueOf()].do(this._hardwareContext, this._storage);
            this._storage = AlmImmutablePipelineStorage.extendFrom(latestStorage);
            this._stage = this._storage.stage;
        }

        const output = new AlmIterationOutput(this._storage, hasNextStage);
        if (!hasNextStage) {
            this._storage = null;
        }
        return output;
    }

    private didInstructionPtrChange(): boolean {
        return !!this._storage.output && this._storage.output.mutators.some(m => m.target === MutatorTarget.Register && (m as RegisterMutator).register === Register.InstructionPtr);
    }

    private readonly _workers: Array<PipelineWorker> = [
        new DecodeStageWorker(),
        new FetchStageWorker(),
        new ExecuteStageWorker(),
        new MemoryWriteBackStageWorker(),
        new RegisterWriteBackStageWorker()
    ];
}