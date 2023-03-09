import { IterationOutput } from '../pipeline/iteration-output';
import { Byte, QuadByte } from '@allium/types';
import { Clock } from '../clock/clock';
import { IoController } from '../ionew/io-controller';
import { SerializedComputer } from './serialized-computer';
import { IoBus } from '@allium/io-bus';

export interface Computer {
    loadProgram(program: Array<Byte>): void;

    advancePipeline(): IterationOutput;
    cyclePipeline(): IterationOutput;

    reset(): void;

    ioController(): IoController;
    ioBus(): IoBus;

    getClock(): Clock;
    setClock(clock: Clock): void;

    getCycleCount(): QuadByte;

    isIdle(): boolean;

    serialize(): SerializedComputer;
    
}
