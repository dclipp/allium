import { AlmFlagSet } from './flags/flag-set';
import { AlmPipeline } from '../pipeline/pipeline';
import { FlagSet, CpuInfo, Cpu, ArgumentFetcher, RegisterSet, Pipeline, IterationOutput, MemoryModule, HardwareContext, IoController } from '@allium/arch';

export class CpuInstance<TRegSet extends RegisterSet, TMemModule extends MemoryModule, TIoController extends IoController> implements Cpu<TRegSet> {
    public readonly flagSet: FlagSet;
    public readonly argumentFetcher: ArgumentFetcher;
    public readonly info: CpuInfo;
    private readonly _pipeline: Pipeline;
    private readonly _registerSet: TRegSet;
    
    public get registerSet(): TRegSet {
        return this._registerSet;
    }

    public iterate(): IterationOutput {
        const output = this._pipeline.advance();
        return output;
    }

    public constructor(hardwareContext: HardwareContext<TRegSet, TMemModule, Cpu<TRegSet>, TIoController>) {

        this.argumentFetcher = hardwareContext.argumentFetcher;

        this.flagSet = new AlmFlagSet();
        this.info = hardwareContext.cpuInfo;
        
        this._registerSet = hardwareContext.registerSet;

        this._pipeline = new AlmPipeline(hardwareContext);
    }

}