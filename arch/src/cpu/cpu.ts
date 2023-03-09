import { FlagSet } from './flag-set';
import { RegisterSet } from '../registers/register-set';
import { ArgumentFetcher } from './argument-fetcher';
import { IterationOutput } from '../pipeline/iteration-output';
import { CpuInfo } from './info/cpu-info';

export interface Cpu<TRegSet extends RegisterSet> {
    readonly flagSet: FlagSet;
    readonly registerSet: TRegSet;
    readonly argumentFetcher: ArgumentFetcher;
    readonly info: CpuInfo;

    iterate(): IterationOutput;
}
