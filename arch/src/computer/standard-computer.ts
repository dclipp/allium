import { IterationOutput } from '../pipeline/iteration-output';
import { Computer } from './computer';

export interface StandardComputer extends Computer {
    run(onHalt: (output: IterationOutput) => void, continueExecution?: (output: IterationOutput) => boolean): void;
}
